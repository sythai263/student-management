import { GRADE_SLOT_WEIGHT, type GradeSlot } from "@constants";

const SLOTS: GradeSlot[] = ["tx1", "tx2", "tx3", "tx4", "gk", "ck"];

/**
 * Calculate the weighted average for a grade row.
 * Returns null when no scores are present.
 */
export function calculateAverage(
  scores: Partial<Record<GradeSlot, number | null | undefined>>,
): number | null {
  let total = 0;
  let weight = 0;
  for (const slot of SLOTS) {
    const score = scores[slot];
    if (score != null) {
      total += score * GRADE_SLOT_WEIGHT[slot];
      weight += GRADE_SLOT_WEIGHT[slot];
    }
  }
  if (weight === 0) return null;
  return Math.round((total / weight) * 100) / 100;
}

/** Parse a single score input. Empty is valid; out of 0..10 or NaN is invalid. */
export function parseScoreInput(value: string): { value: number | null; invalid: boolean } {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return { value: null, invalid: false };
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0 || n > 10) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

/** Normalize a header/cell for loose matching (diacritics, case, spaces). */
function normalizeHeader(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type MappedColumn =
  | "studentCode"
  | "fullName"
  | GradeSlot
  | "note"
  | "comment"
  | null;

const HEADER_ALIASES: Record<NonNullable<MappedColumn>, string[]> = {
  studentCode: [
    "mahs",
    "mahocsinh",
    "mahocsinh",
    "mhs",
    "mshs",
    "masohocsinh",
    "studentcode",
    "studentid",
    "id",
  ],
  fullName: [
    "hoten",
    "hovaten",
    "hovatèn",
    "hotenhocsinh",
    "fullname",
    "name",
    "ten",
    "tenhocsinh",
  ],
  tx1: ["tx1", "thuongxuyen1", "diemthuongxuyen1", "diemtx1"],
  tx2: ["tx2", "thuongxuyen2", "diemthuongxuyen2", "diemtx2"],
  tx3: ["tx3", "thuongxuyen3", "diemthuongxuyen3", "diemtx3"],
  tx4: ["tx4", "thuongxuyen4", "diemthuongxuyen4", "diemtx4"],
  gk: ["gk", "giuaky", "diemgiuaky", "diemgk", "ktgk", "kiemtragiuaky"],
  ck: ["ck", "cuoiky", "diemcuoiky", "diemck", "ktck", "kiemtracuoiky"],
  note: ["ghichu", "chuthich", "note"],
  comment: ["nhanxet", "danhgia", "comment"],
};

function detectColumnAlias(header: string): MappedColumn {
  const h = normalizeHeader(header);
  if (h === "") return null;
  for (const [column, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      if (h === alias || h.includes(alias)) {
        return column as NonNullable<MappedColumn>;
      }
    }
  }
  return null;
}

/** Split a CSV line respecting double quotes. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(line: string): string {
  const commas = (line.match(/,/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

export interface CsvMappedRow {
  lineNo: number;
  studentCode: string | null;
  fullName: string | null;
  scores: Record<GradeSlot, number | null>;
  invalidScores: GradeSlot[];
  note: string | null;
  comment: string | null;
}

export interface ParseGradeCsvResult {
  hasHeader: boolean;
  rows: CsvMappedRow[];
}

/** Parse a flexible CSV for grade import.
 *  Supports Vietnamese/English headers, comma/semicolon delimiters, quoted cells, and BOM.
 */
export function parseGradeCsv(text: string): ParseGradeCsvResult {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const allLines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (allLines.length === 0) {
    return { hasHeader: false, rows: [] };
  }

  const delimiter = detectDelimiter(allLines[0] ?? "");
  const firstCells = splitCsvLine(allLines[0] ?? "", delimiter);
  const firstAliases = firstCells
    .map((c, i) => ({ col: i, alias: detectColumnAlias(c) }))
    .filter((x): x is { col: number; alias: NonNullable<MappedColumn> } => !!x.alias);

  const hasHeader = firstAliases.length > 0;

  let headerMapping: Record<NonNullable<MappedColumn>, number> = {
    studentCode: 0,
    fullName: -1,
    tx1: 1,
    tx2: 2,
    tx3: 3,
    tx4: 4,
    gk: 5,
    ck: 6,
    note: 7,
    comment: 8,
  };

  if (hasHeader) {
    for (const { col, alias } of firstAliases) {
      headerMapping[alias] = col;
    }
  }

  const dataLines = hasHeader ? allLines.slice(1) : allLines;
  const rows: CsvMappedRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const lineNo = (hasHeader ? 2 : 1) + i;
    const cells = splitCsvLine(dataLines[i] ?? "", delimiter);

    const get = (col: number): string => (cells[col] ?? "").trim();

    const scores: Record<GradeSlot, number | null> = {
      tx1: null,
      tx2: null,
      tx3: null,
      tx4: null,
      gk: null,
      ck: null,
    };
    const invalidScores: GradeSlot[] = [];

    for (const slot of SLOTS) {
      const col = headerMapping[slot];
      if (col < 0) continue;
      const { value, invalid } = parseScoreInput(get(col));
      scores[slot] = value;
      if (invalid) invalidScores.push(slot);
    }

    rows.push({
      lineNo,
      studentCode: headerMapping.studentCode >= 0 ? get(headerMapping.studentCode) || null : null,
      fullName: headerMapping.fullName >= 0 ? get(headerMapping.fullName) || null : null,
      scores,
      invalidScores,
      note:
        headerMapping.note >= 0
          ? get(headerMapping.note) || null
          : null,
      comment:
        headerMapping.comment >= 0
          ? get(headerMapping.comment) || null
          : null,
    });
  }

  return { hasHeader, rows };
}
