import { Readable } from "node:stream";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import ExcelJS from "exceljs";
import { removeDiacritics } from "@lib/string";
import { nextStudentCode } from "@lib/student-code";

dayjs.extend(customParseFormat);

/** One parsed roster row — STT is kept for generated-code suffixes. */
export interface ImportRow {
  stt: string | null;
  studentCode: string | null;
  lastName: string;
  firstName: string;
  nameSuffix: string | null;
  dateOfBirth: string | null;
}

/** Row shape written to the students table. */
export interface StudentWriteRow {
  classId: string;
  lastName: string;
  firstName: string;
  nameSuffix: string | null;
  dateOfBirth: string | null;
  studentCode: string | null;
}

/** A class student as fetched for name matching / conflict checks. */
export interface RosterStudent {
  id: string;
  lastName: string;
  firstName: string;
  nameSuffix: string | null;
  dateOfBirth: string | null;
  studentCode: string | null;
}

/** Roster pre-indexed for name matching and code-conflict checks. */
export interface RosterIndex {
  byName: Map<string, RosterStudent>;
  idsByName: Map<string, string[]>;
  ambiguousNames: Set<string>;
  ownerByCode: Map<string, string>;
}

export interface SkippedStudentRow {
  lastName: string;
  firstName: string;
  nameSuffix: string | null;
  dateOfBirth: string | null;
}

export interface SkippedStudentGroup {
  /** File rows sharing one name — displayed as A, B, C… to tell apart. */
  fileRows: SkippedStudentRow[];
  /** Roster students already bearing that name (may be empty). */
  existing: (SkippedStudentRow & {
    id: string;
    studentCode: string | null;
  })[];
}

/**
 * Diacritic-insensitive identity key for name-based dedupe. The
 * nameSuffix is part of the identity: "Vĩnh (A)" and "Vĩnh (B)" are
 * different students, while two plain "Vĩnh" rows still collide.
 */
export function nameKey(
  lastName: string,
  firstName: string,
  nameSuffix?: string | null,
): string {
  return removeDiacritics(
    `${lastName} ${firstName}` + (nameSuffix ? ` ${nameSuffix}` : ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Trailing "(X)" on a name cell carries the nameSuffix — "Vĩnh (A)". */
function splitSuffix(name: string): { name: string; suffix: string | null } {
  const m = name.match(/^(.*?)\s*\(([A-Za-z0-9]{1,10})\)\s*$/);
  return m
    ? { name: m[1].trim(), suffix: m[2].toUpperCase() }
    : { name, suffix: null };
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  // DD/MM is tried before MM/DD: unambiguous dates (day > 12) fall
  // through correctly either way, and ambiguous ones resolve to the
  // Vietnamese convention.
  const parsed = dayjs(value.trim(), [
    "YYYY-MM-DD",
    "YYYY-M-D",
    "DD/MM/YYYY",
    "D/M/YYYY",
    "MM/DD/YYYY",
    "M/D/YYYY",
  ]);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

/**
 * Cell → plain text. Date cells keep their real value (format-free, so
 * a cell displayed "15/03/2010" still parses right); formulas resolve to
 * their cached result; rich text / hyperlinks collapse to plain text.
 */
function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (v instanceof Date) return dayjs(v).format("YYYY-MM-DD");
  if (typeof v === "object") {
    if ("richText" in v) {
      return v.richText.map((t) => t.text).join("");
    }
    if ("result" in v) return v.result == null ? "" : String(v.result);
    if ("text" in v) return String(v.text);
  }
  return String(v);
}

async function loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    await workbook.xlsx.load(await file.arrayBuffer());
  } else {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    // Vietnamese-locale Excel writes ";" CSVs — detect from line one.
    const delimiter = (text.split(/\r?\n/, 1)[0] ?? "").includes(";")
      ? ";"
      : ",";
    await workbook.csv.read(Readable.from(text), {
      parserOptions: { delimiter },
    });
  }
  return workbook;
}

/** Non-empty sheet lines keyed by their 1-based row number. */
function sheetLines(worksheet: ExcelJS.Worksheet): Map<number, string[]> {
  const lines = new Map<number, string[]>();
  worksheet.eachRow((row, lineNo) => {
    const cells: string[] = [];
    const values = Array.isArray(row.values) ? row.values : [];
    for (let i = 1; i < values.length; i++) {
      cells.push(cellText(row.getCell(i)).trim());
    }
    while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
    if (cells.length > 0) lines.set(lineNo, cells);
  });
  return lines;
}

function isHeaderRow(cells: string[]): boolean {
  const firstCell = (cells[0] ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /^(stt|ma|so|sbd|id|student)\s*(hs|hocsinh|hoc sinh|code|id|so|bao danh)?$/i.test(
    firstCell,
  );
}

function fullNameRow(
  stt: string | null,
  studentCode: string | null,
  full: string,
  dateOfBirth: string | null,
): ImportRow | null {
  const { name, suffix } = splitSuffix(full);
  const cut = name.lastIndexOf(" ");
  if (cut < 0) return null;
  return {
    stt,
    studentCode,
    lastName: name.slice(0, cut),
    firstName: name.slice(cut + 1),
    nameSuffix: suffix,
    dateOfBirth,
  };
}

function splitNameRow(
  stt: string | null,
  studentCode: string | null,
  last: string,
  first: string,
  dateOfBirth: string | null,
): ImportRow {
  const { name, suffix } = splitSuffix(first);
  return {
    stt,
    studentCode,
    lastName: last,
    firstName: name,
    nameSuffix: suffix,
    dateOfBirth,
  };
}

/**
 * Map a raw cell row to an ImportRow — column 0 is STT, column 1 is
 * MSHS (may be blank → code auto-assigned):
 *  - 3 cells: STT,MSHS,"Họ và tên" (full name split on the last space)
 *  - 4 cells: last cell containing a digit = dob (layout 1 + dob),
 *    otherwise it's Tên (layout 2 without dob)
 *  - 5 cells: STT,MSHS,"Họ đệm",Tên,Ngày sinh
 * Returns null for anything else.
 */
function rowFromCells(cells: string[]): ImportRow | null {
  const stt = cells[0] || null;
  const studentCode = cells[1] || null;
  if (cells.length === 3) {
    return cells[2] ? fullNameRow(stt, studentCode, cells[2], null) : null;
  }
  if (cells.length === 4) {
    if (!cells[2]) return null;
    return /\d/.test(cells[3])
      ? fullNameRow(stt, studentCode, cells[2], parseDate(cells[3]))
      : splitNameRow(stt, studentCode, cells[2], cells[3], null);
  }
  if (cells.length === 5) {
    return cells[2] && cells[3]
      ? splitNameRow(stt, studentCode, cells[2], cells[3], parseDate(cells[4]))
      : null;
  }
  return null;
}

/**
 * Read the uploaded roster (.xlsx or .csv) via ExcelJS — quoted cells,
 * BOM, ";" delimiters and real Date cells are all handled for us.
 * Exactly two layouts are accepted (see rowFromCells); a row matching
 * neither aborts the import instead of creating garbage students.
 * Accepted date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY (short
 * variants too); ambiguous slash dates resolve as DD/MM.
 */
export async function parseSheet(file: File): Promise<ImportRow[]> {
  const workbook = await loadWorkbook(file);
  const worksheet = workbook.worksheets[0];
  const lines = worksheet ? sheetLines(worksheet) : new Map<number, string[]>();

  const rows: ImportRow[] = [];
  const badLines: number[] = [];
  let firstLine = true;
  for (const [lineNo, cells] of lines) {
    if (firstLine && isHeaderRow(cells)) {
      firstLine = false;
      continue;
    }
    firstLine = false;
    const row = rowFromCells(cells);
    if (row?.lastName && row.firstName) rows.push(row);
    else badLines.push(lineNo);
  }
  if (badLines.length > 0) {
    throw new Error(
      `Tệp sai định dạng ở dòng ${badLines.slice(0, 5).join(", ")}` +
      (badLines.length > 5 ? ", …" : "") +
      ". Chỉ chấp nhận: STT, Mã HS, Họ và tên, Ngày sinh — hoặc STT, Mã HS, Họ đệm, Tên, Ngày sinh",
    );
  }
  return rows;
}

/**
 * Dedupe inside the file itself — last row per match key wins, so a
 * repeated key can't hit "ON CONFLICT cannot affect row twice".
 */
export function dedupeRows(
  rows: ImportRow[],
  matchBy: "code" | "name",
): ImportRow[] {
  const deduped = new Map<string, ImportRow>();
  rows.forEach((r, i) => {
    const key =
      matchBy === "name"
        ? nameKey(r.lastName, r.firstName, r.nameSuffix)
        : (r.studentCode ?? `__row_${i}`);
    deduped.set(key, r);
  });
  return [...deduped.values()];
}

/** Index the class roster once for name lookup + code ownership. */
export function indexRoster(students: RosterStudent[]): RosterIndex {
  const byName = new Map<string, RosterStudent>();
  const idsByName = new Map<string, string[]>();
  const ambiguousNames = new Set<string>();
  const ownerByCode = new Map<string, string>();
  for (const s of students) {
    const key = nameKey(s.lastName, s.firstName, s.nameSuffix);
    const list = idsByName.get(key);
    if (list) {
      list.push(s.id);
      ambiguousNames.add(key);
    } else {
      idsByName.set(key, [s.id]);
      byName.set(key, s);
    }
    if (s.studentCode) {
      ownerByCode.set(s.studentCode, s.id);
    }
  }
  return { byName, idsByName, ambiguousNames, ownerByCode };
}

export interface ResolvedRow {
  row: ImportRow;
  existing: RosterStudent | undefined;
}

export interface MatchResult {
  resolved: ResolvedRow[];
  /** File-row groups that can't be told apart, keyed by nameKey. */
  skippedFileRows: Map<string, ImportRow[]>;
  /** Roster ids sharing a skipped name — kept even in replace mode. */
  preserveIds: Set<string>;
}

/**
 * Pair file rows with roster students by name. Rows sharing a name —
 * inside the file or against ambiguous roster names — can't be told
 * apart, so they're skipped and reported back for manual resolution
 * instead of guessed.
 */
export function matchRows(
  rows: ImportRow[],
  roster: RosterIndex,
): MatchResult {
  const skippedFileRows = new Map<string, ImportRow[]>();
  const skipRow = (key: string, r: ImportRow) => {
    const list = skippedFileRows.get(key);
    if (list) list.push(r);
    else skippedFileRows.set(key, [r]);
  };

  const fileNameCount = new Map<string, number>();
  for (const r of rows) {
    const key = nameKey(r.lastName, r.firstName, r.nameSuffix);
    fileNameCount.set(key, (fileNameCount.get(key) ?? 0) + 1);
  }
  const candidates = rows.filter((r) => {
    const key = nameKey(r.lastName, r.firstName, r.nameSuffix);
    if ((fileNameCount.get(key) ?? 0) > 1) {
      skipRow(key, r);
      return false;
    }
    return true;
  });

  const preserveIds = new Set<string>();
  const resolved: ResolvedRow[] = [];
  for (const r of candidates) {
    const key = nameKey(r.lastName, r.firstName, r.nameSuffix);
    if (roster.ambiguousNames.has(key)) {
      skipRow(key, r);
      for (const id of roster.idsByName.get(key) ?? []) preserveIds.add(id);
      continue;
    }
    resolved.push({ row: r, existing: roster.byName.get(key) });
  }
  // In replace mode the untouched same-named students are kept, never
  // deleted just because the file row was skipped.
  for (const key of skippedFileRows.keys()) {
    for (const id of roster.idsByName.get(key) ?? []) preserveIds.add(id);
  }
  return { resolved, skippedFileRows, preserveIds };
}

export interface WritePlan {
  updateRows: (StudentWriteRow & { id: string })[];
  insertRows: StudentWriteRow[];
  /** Students whose old code must be nulled before new codes are written. */
  freedIds: string[];
  existingIds: Set<string>;
}

/**
 * Turn resolved row→student pairs into update/insert batches plus the
 * list of codes to vacate. Splits matched vs new into homogeneous
 * batches because PostgREST rejects an upsert whose objects don't share
 * the same key set (PGRST102 "All object keys must match"), and a new
 * row must not carry `id` — an explicit NULL skips gen_random_uuid().
 */
export function planWrites(
  resolved: ResolvedRow[],
  classId: string,
  ownerByCode: Map<string, string>,
  classCode: string,
): WritePlan {
  // Codes the file claims outright — generated fallbacks must not
  // steal them, nor a code already owned by a roster student.
  const taken = new Set<string>(
    resolved
      .map(({ row }) => row.studentCode)
      .filter((c): c is string => !!c),
  );
  // Blank MSHS cell → "<classCode>-<STT padded to 4>"; nextStudentCode
  // when STT is missing/non-numeric or that code is already taken.
  const fallbackCode = (r: ImportRow): string => {
    if (r.stt && /^\d+$/.test(r.stt)) {
      const candidate = `${classCode}-${String(parseInt(r.stt, 10)).padStart(4, "0")}`;
      if (!taken.has(candidate) && !ownerByCode.has(candidate)) {
        taken.add(candidate);
        return candidate;
      }
    }
    return nextStudentCode([...ownerByCode.keys()], taken, classCode);
  };

  // Effective code per file row — computed once up front so swap
  // detection below sees the code each student will actually get.
  // Blank MSHS keeps the matched student's existing code; only a
  // student with no code at all gets a generated one.
  const effectiveCode = new Map<ImportRow, string>();
  const newCodeById = new Map<string, string | null>();
  for (const { row, existing } of resolved) {
    const code = row.studentCode ?? existing?.studentCode ?? fallbackCode(row);
    effectiveCode.set(row, code);
    if (existing) newCodeById.set(existing.id, code);
  }

  const plan: WritePlan = {
    updateRows: [],
    insertRows: [],
    freedIds: [],
    existingIds: new Set(),
  };
  const fileCodes = new Set<string>();
  for (const { row, existing } of resolved) {
    if (row.studentCode) {
      const owner = ownerByCode.get(row.studentCode);
      // The owner relinquishes the code when they are matched in this
      // file and get a different new code.
      const codeFreed =
        !!owner &&
        newCodeById.has(owner) &&
        newCodeById.get(owner) !== row.studentCode;
      if (
        fileCodes.has(row.studentCode) ||
        (owner && owner !== existing?.id && !codeFreed)
      ) {
        throw new Error(
          `Mã học sinh "${row.studentCode}" đã thuộc về học sinh khác trong lớp`,
        );
      }
      fileCodes.add(row.studentCode);
    }
    const studentCode = effectiveCode.get(row)!;
    const base = {
      classId,
      lastName: row.lastName,
      firstName: row.firstName,
    };
    if (existing) {
      plan.existingIds.add(existing.id);
      // On update, blank cells keep the old values — they must not
      // wipe the existing nameSuffix / dateOfBirth / studentCode.
      // A blank MSHS cell only generates a code when the student
      // doesn't already have one.
      if (studentCode !== existing.studentCode) {
        plan.freedIds.push(existing.id);
      }
      plan.updateRows.push({
        id: existing.id,
        ...base,
        nameSuffix: row.nameSuffix ?? existing.nameSuffix,
        dateOfBirth: row.dateOfBirth ?? existing.dateOfBirth,
        studentCode,
      });
    } else {
      plan.insertRows.push({
        ...base,
        nameSuffix: row.nameSuffix,
        dateOfBirth: row.dateOfBirth,
        studentCode,
      });
    }
  }
  return plan;
}

/**
 * Turn skipped file-row groups into dialog data — offer every roster
 * student sharing the BASE name (suffix ignored): a "Vĩnh" file row
 * may legitimately map to the existing "Vĩnh (A)".
 */
export function buildSkippedGroups(
  skippedFileRows: Map<string, ImportRow[]>,
  students: RosterStudent[],
): SkippedStudentGroup[] {
  return [...skippedFileRows.entries()].map(([, fileRows]) => ({
    fileRows: fileRows.map(
      ({ lastName, firstName, nameSuffix, dateOfBirth }) => ({
        lastName,
        firstName,
        nameSuffix,
        dateOfBirth,
      }),
    ),
    existing: students
      .filter(
        (s) =>
          nameKey(s.lastName, s.firstName) ===
          nameKey(fileRows[0]?.lastName ?? "", fileRows[0]?.firstName ?? ""),
      )
      .map((s) => ({
        id: s.id,
        lastName: s.lastName,
        firstName: s.firstName,
        nameSuffix: s.nameSuffix,
        dateOfBirth: s.dateOfBirth,
        studentCode: s.studentCode,
      })),
  }));
}
