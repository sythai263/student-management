"use server";

import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { initializeGradesForClassStudents } from "@lib/grades";
import { deleteFaceVector } from "@lib/rekognition";
import { deleteObject } from "@lib/storage";
import { removeDiacritics } from "@lib/string";
import { nextStudentCode } from "@lib/student-code";
import { createSupabaseServerClient } from "@lib/supabase";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

dayjs.extend(customParseFormat);

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

export interface ImportStudentsSummary {
  inserted: number;
  updated: number;
  deleted: number;
  /** Ambiguous-name groups skipped — teacher registers them by hand. */
  skipped: SkippedStudentGroup[];
}

interface CsvRow {
  studentCode: string | null;
  lastName: string;
  firstName: string;
  nameSuffix: string | null;
  dateOfBirth: string | null;
}

interface StudentWriteRow {
  classId: string;
  lastName: string;
  firstName: string;
  nameSuffix: string | null;
  dateOfBirth: string | null;
  studentCode: string | null;
}

/**
 * Diacritic-insensitive identity key for name-based dedupe. The
 * nameSuffix is part of the identity: "Vĩnh (A)" and "Vĩnh (B)" are
 * different students, while two plain "Vĩnh" rows still collide.
 */
function nameKey(
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

/** School rosters number rows "1,2,3…" — that STT is not a studentCode. */
function codeCell(value: string): string | null {
  if (!value || /^\d+$/.test(value)) return null;
  return value;
}

/**
 * Parse CSV text. Two layouts are accepted:
 *  - STT|studentCode,lastName,firstName,dateOfBirth(optional) — a numeric
 *    first cell is STT, not a code.
 *  - STT,"Họ và tên" — the school-issued roster: the full name is split
 *    on the last space (Tên = last token, Họ đệm = the rest).
 * Accepted date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY (short
 * variants too); ambiguous slash dates resolve as DD/MM.
 * Skips a header row if the first cell looks like a code label.
 */
function parseCsv(text: string): CsvRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const cells = line.split(",").map((c) => c.trim());
      const firstCell = (cells[0] ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (
        index === 0 &&
        /^(stt|ma|so|sbd|id|student)\s*(hs|hocsinh|hoc sinh|code|id|so|bao danh)?$/i.test(
          firstCell,
        )
      ) {
        return [];
      }
      if (cells.length === 2 && cells[1]) {
        const { name, suffix } = splitSuffix(cells[1]);
        const cut = name.lastIndexOf(" ");
        if (cut < 0) return [];
        return [
          {
            studentCode: codeCell(cells[0]),
            lastName: name.slice(0, cut),
            firstName: name.slice(cut + 1),
            nameSuffix: suffix,
            dateOfBirth: null,
          },
        ];
      }
      if (cells.length < 3 || !cells[1] || !cells[2]) return [];
      const { name: firstName, suffix } = splitSuffix(cells[2]);
      return [
        {
          studentCode: codeCell(cells[0]),
          lastName: cells[1],
          firstName,
          nameSuffix: suffix,
          dateOfBirth: parseDate(cells[3]),
        },
      ];
    });
}

/**
 * Server Action: bulk-import students into a class from a CSV file.
 * Duplicate rows are matched by `matchBy` ("code" = studentCode,
 * "name" = diacritic-insensitive Họ đệm + Tên). `importMode` "replace"
 * treats the file as the complete new roster and removes every class
 * student absent from it. Owner check is enforced by RLS (teacher must
 * own the class).
 */
export async function importStudents(
  formData: FormData,
): Promise<ActionResult<ImportStudentsSummary>> {
  const classId = formData.get("classId");
  const matchBy = formData.get("matchBy") === "name" ? "name" : "code";
  const replace = formData.get("importMode") === "replace";

  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    if (typeof classId !== "string" || classId.length === 0) {
      throw new Error("Thiếu thông tin lớp học");
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Chưa chọn tệp danh sách");
    }

    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      throw new Error("Tệp danh sách không có dữ liệu hợp lệ");
    }

    // classCode prefixes every auto-generated studentCode; fetching it
    // also proves ownership early (RLS hides other teachers' classes).
    const { data: cls, error: clsError } = await supabase
      .from("classes")
      .select("classCode")
      .eq("id", classId)
      .single();
    if (clsError) throw new Error("Không tìm thấy lớp học");
    const classCode = cls.classCode as string;

    // Rows sharing a name can't be told apart — don't guess: skip them
    // and report the group back so the teacher registers each one via
    // the form.
    const skippedFileRows = new Map<string, CsvRow[]>();
    const skipRow = (key: string, r: CsvRow) => {
      const list = skippedFileRows.get(key);
      if (list) list.push(r);
      else skippedFileRows.set(key, [r]);
    };
    let processRows = rows;
    if (matchBy === "name") {
      const fileNameCount = new Map<string, number>();
      for (const r of rows) {
        const key = nameKey(r.lastName, r.firstName, r.nameSuffix);
        fileNameCount.set(key, (fileNameCount.get(key) ?? 0) + 1);
      }
      processRows = rows.filter((r) => {
        const key = nameKey(r.lastName, r.firstName, r.nameSuffix);
        if ((fileNameCount.get(key) ?? 0) > 1) {
          skipRow(key, r);
          return false;
        }
        return true;
      });
    }

    // Dedupe inside the file itself — last row per match key wins, so
    // a repeated key can't hit "ON CONFLICT cannot affect row twice".
    const deduped = new Map<string, CsvRow>();
    processRows.forEach((r, i) => {
      const key =
        matchBy === "name"
          ? nameKey(r.lastName, r.firstName, r.nameSuffix)
          : (r.studentCode ?? `__row_${i}`);
      deduped.set(key, r);
    });
    const dedupedRows = [...deduped.values()];

    // --- Resolve which rows update an existing student vs insert ---
    const existingIds = new Set<string>();
    if (matchBy === "code") {
      const codes = dedupedRows
        .map((r) => r.studentCode)
        .filter((c): c is string => !!c);
      const dobByCode = new Map<string, string | null>();
      if (codes.length > 0) {
        const { data: existing, error: existingError } = await supabase
          .from("students")
          .select("id, studentCode, dateOfBirth")
          .eq("classId", classId)
          .in("studentCode", codes);
        if (existingError) throw new Error(existingError.message);
        for (const s of existing ?? []) {
          existingIds.add(s.id as string);
          dobByCode.set(
            s.studentCode as string,
            (s.dateOfBirth as string | null) ?? null,
          );
        }
      }

      // Auto-number codeless new students: "<classCode>-NNNN"
      // continuing the highest code already in use.
      const codeless = dedupedRows.filter((r) => !r.studentCode);
      if (codeless.length > 0) {
        const { data: codeRows, error: codeError } = await supabase
          .from("students")
          .select("studentCode")
          .eq("classId", classId);
        if (codeError) throw new Error(codeError.message);
        const taken = new Set(
          dedupedRows
            .map((r) => r.studentCode)
            .filter((c): c is string => !!c),
        );
        const existingCodes = (codeRows ?? []).map(
          (c) => c.studentCode as string | null,
        );
        for (const r of codeless) {
          r.studentCode = nextStudentCode(existingCodes, taken, classCode);
        }
      }

      const { data: upserted, error } = await supabase
        .from("students")
        .upsert(
          dedupedRows.map((r) => ({
            ...r,
            classId,
            // On update, a blank cell must not wipe an existing date.
            dateOfBirth:
              r.dateOfBirth ??
              (r.studentCode ? dobByCode.get(r.studentCode) : null) ??
              null,
          })),
          { onConflict: '"studentCode","classId"' },
        )
        .select();
      if (error) throw new Error(error.message);
      return finishImport(
        supabase,
        classId,
        upserted ?? [],
        existingIds,
        replace,
        [],
        new Set(),
      );
    }

    // matchBy === "name": match on normalized "Họ đệm Tên".
    const { data: all, error: allError } = await supabase
      .from("students")
      .select("id, lastName, firstName, nameSuffix, studentCode, dateOfBirth")
      .eq("classId", classId);
    if (allError) throw new Error(allError.message);

    interface ExistingStudent {
      id: string;
      studentCode: string | null;
      nameSuffix: string | null;
      dateOfBirth: string | null;
    }
    const byName = new Map<string, ExistingStudent>();
    const idsByName = new Map<string, string[]>();
    const ambiguousNames = new Set<string>();
    const ownerByCode = new Map<string, string>();
    for (const s of all ?? []) {
      const key = nameKey(
        s.lastName as string,
        s.firstName as string,
        s.nameSuffix as string | null,
      );
      const list = idsByName.get(key);
      if (list) {
        list.push(s.id as string);
        ambiguousNames.add(key);
      } else {
        idsByName.set(key, [s.id as string]);
      }
      if (byName.has(key)) continue;
      byName.set(key, {
        id: s.id as string,
        studentCode: (s.studentCode as string | null) ?? null,
        nameSuffix: (s.nameSuffix as string | null) ?? null,
        dateOfBirth: (s.dateOfBirth as string | null) ?? null,
      });
      if (s.studentCode) {
        ownerByCode.set(s.studentCode as string, s.id as string);
      }
    }

    // A file row matching an ambiguous roster name can't be resolved
    // either — skip it like an in-file duplicate. In replace mode the
    // untouched same-named students are kept (preserveIds), never
    // deleted just because the file row was skipped.
    const preserveIds = new Set<string>();
    for (const key of skippedFileRows.keys()) {
      for (const id of idsByName.get(key) ?? []) preserveIds.add(id);
    }
    const resolved: { r: CsvRow; existing: ExistingStudent | undefined }[] =
      [];
    for (const r of dedupedRows) {
      const key = nameKey(r.lastName, r.firstName, r.nameSuffix);
      if (ambiguousNames.has(key)) {
        skipRow(key, r);
        for (const id of idsByName.get(key) ?? []) preserveIds.add(id);
        continue;
      }
      resolved.push({ r, existing: byName.get(key) });
    }

    const skipped: SkippedStudentGroup[] = [
      ...skippedFileRows.entries(),
    ].map(([, fileRows]) => ({
      fileRows: fileRows.map(
        ({ lastName, firstName, nameSuffix, dateOfBirth }) => ({
          lastName,
          firstName,
          nameSuffix,
          dateOfBirth,
        }),
      ),
      // Offer every roster student sharing the BASE name (suffix
      // ignored) — a "Vĩnh" file row may legitimately map to the
      // existing "Vĩnh (A)".
      existing: (all ?? [])
        .filter(
          (s) =>
            nameKey(s.lastName as string, s.firstName as string) ===
            nameKey(fileRows[0]?.lastName ?? "", fileRows[0]?.firstName ?? ""),
        )
        .map((s) => ({
          id: s.id as string,
          lastName: s.lastName as string,
          firstName: s.firstName as string,
          nameSuffix: (s.nameSuffix as string | null) ?? null,
          dateOfBirth: (s.dateOfBirth as string | null) ?? null,
          studentCode: (s.studentCode as string | null) ?? null,
        })),
    }));
    const newCodeById = new Map<string, string | null>();
    for (const { r, existing } of resolved) {
      if (existing) {
        newCodeById.set(
          existing.id,
          r.studentCode ?? existing.studentCode,
        );
      }
    }

    // Split matched vs new rows into separate homogeneous batches.
    // PostgREST rejects an upsert whose objects don't share the same
    // key set (PGRST102 "All object keys must match"), and a new row
    // must not carry `id` at all — an explicit NULL skips
    // gen_random_uuid() and violates the PK not-null constraint.
    const updateRows: (StudentWriteRow & { id: string })[] = [];
    const insertRows: StudentWriteRow[] = [];
    const fileCodes = new Set<string>();
    const freedIds: string[] = [];
    for (const { r, existing } of resolved) {
      if (r.studentCode) {
        const owner = ownerByCode.get(r.studentCode);
        // The owner relinquishes the code when they are matched in this
        // file and get a different new code.
        const codeFreed =
          !!owner &&
          newCodeById.has(owner) &&
          newCodeById.get(owner) !== r.studentCode;
        if (
          fileCodes.has(r.studentCode) ||
          (owner && owner !== existing?.id && !codeFreed)
        ) {
          throw new Error(
            `Mã học sinh "${r.studentCode}" đã thuộc về học sinh khác trong lớp`,
          );
        }
        fileCodes.add(r.studentCode);
      }
      const base = {
        classId,
        lastName: r.lastName,
        firstName: r.firstName,
      };
      if (existing) {
        existingIds.add(existing.id);
        // On update, blank cells keep the old values — they must not
        // wipe the existing studentCode / nameSuffix / dateOfBirth.
        const studentCode = r.studentCode ?? existing.studentCode;
        if (studentCode !== existing.studentCode) {
          freedIds.push(existing.id);
        }
        updateRows.push({
          id: existing.id,
          ...base,
          nameSuffix: r.nameSuffix ?? existing.nameSuffix,
          dateOfBirth: r.dateOfBirth ?? existing.dateOfBirth,
          studentCode,
        });
      } else {
        insertRows.push({
          ...base,
          nameSuffix: r.nameSuffix,
          dateOfBirth: r.dateOfBirth,
          studentCode: r.studentCode,
        });
      }
    }

    // Auto-number codeless new students — same rule as code mode.
    const codelessInserts = insertRows.filter((r) => !r.studentCode);
    if (codelessInserts.length > 0) {
      for (const row of codelessInserts) {
        row.studentCode = nextStudentCode(
          [...ownerByCode.keys()],
          fileCodes,
          classCode,
        );
      }
    }

    // Free renamed codes before writing: Postgres checks the
    // (studentCode, classId) unique constraint per row, so a swap
    // (A takes B's old code) fails mid-batch unless the old codes
    // are vacated first. NULLs never conflict.
    if (freedIds.length > 0) {
      const { error: freeError } = await supabase
        .from("students")
        .update({ studentCode: null })
        .in("id", freedIds);
      if (freeError) throw new Error(freeError.message);
    }

    const upserted: Record<string, unknown>[] = [];
    if (updateRows.length > 0) {
      const { data, error } = await supabase
        .from("students")
        .upsert(updateRows)
        .select();
      if (error) throw new Error(error.message);
      upserted.push(...(data ?? []));
    }
    if (insertRows.length > 0) {
      const { data, error } = await supabase
        .from("students")
        .insert(insertRows)
        .select();
      if (error) throw new Error(error.message);
      upserted.push(...(data ?? []));
    }
    return finishImport(
      supabase,
      classId,
      upserted,
      existingIds,
      replace,
      skipped,
      preserveIds,
    );
  });

  if (result.success && typeof classId === "string") {
    revalidatePath(`/classes/${classId}`);
  }
  return result;
}

export interface ResolveSkippedRow {
  lastName: string;
  firstName: string;
  /** Suffix parsed from the file row ("Vĩnh (A)"), if any. */
  nameSuffix: string | null;
  dateOfBirth: string | null;
  /** Roster student this file row updates; null = create a new one. */
  existingStudentId: string | null;
  /** Letter the dialog assigned to this row ("A", "B") for new students. */
  assignedSuffix: string;
}

export interface ResolveSkippedInput {
  classId: string;
  rows: ResolveSkippedRow[];
}

/**
 * Server Action: resolve ambiguous-name rows the import skipped. Each
 * row either updates the roster student the teacher mapped it to, or
 * inserts a new student whose nameSuffix column carries the
 * distinguishing mark ("Vĩnh (A)") so the identity stays unique.
 */
export async function resolveSkippedStudents(
  input: ResolveSkippedInput,
): Promise<ActionResult<ImportStudentsSummary>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();
    const { classId, rows } = input;
    if (typeof classId !== "string" || classId.length === 0) {
      throw new Error("Thiếu thông tin lớp học");
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Không có học sinh cần xử lý");
    }

    const { data: cls, error: clsError } = await supabase
      .from("classes")
      .select("classCode")
      .eq("id", classId)
      .single();
    if (clsError) throw new Error("Không tìm thấy lớp học");
    const classCode = cls.classCode as string;

    const { data: all, error: allError } = await supabase
      .from("students")
      .select("id, studentCode, nameSuffix, dateOfBirth")
      .eq("classId", classId);
    if (allError) throw new Error(allError.message);
    const roster = new Map(
      (all ?? []).map((s) => [
        s.id as string,
        {
          studentCode: (s.studentCode as string | null) ?? null,
          nameSuffix: (s.nameSuffix as string | null) ?? null,
          dateOfBirth: (s.dateOfBirth as string | null) ?? null,
        },
      ]),
    );

    // A mapped id must belong to THIS class and absorb only one row.
    const claimed = new Set<string>();
    for (const r of rows) {
      if (!r.existingStudentId) continue;
      if (!roster.has(r.existingStudentId)) {
        throw new Error("Học sinh được chọn không thuộc lớp này");
      }
      if (claimed.has(r.existingStudentId)) {
        throw new Error("Một học sinh trong lớp chỉ được ghép với một dòng");
      }
      claimed.add(r.existingStudentId);
    }

    const existingIds = new Set<string>();
    const updateRows: (StudentWriteRow & { id: string })[] = [];
    const insertRows: StudentWriteRow[] = [];
    const existingCodes = (all ?? []).map(
      (s) => s.studentCode as string | null,
    );
    const taken = new Set<string>();
    for (const r of rows) {
      const existing = r.existingStudentId
        ? roster.get(r.existingStudentId)
        : undefined;
      if (existing && r.existingStudentId) {
        existingIds.add(r.existingStudentId);
        updateRows.push({
          id: r.existingStudentId,
          classId,
          lastName: r.lastName,
          firstName: r.firstName,
          nameSuffix: r.nameSuffix ?? existing.nameSuffix,
          dateOfBirth: r.dateOfBirth ?? existing.dateOfBirth,
          studentCode: existing.studentCode,
        });
      } else {
        insertRows.push({
          classId,
          lastName: r.lastName,
          firstName: r.firstName,
          nameSuffix: r.nameSuffix ?? r.assignedSuffix,
          dateOfBirth: r.dateOfBirth,
          studentCode: nextStudentCode(existingCodes, taken, classCode),
        });
      }
    }

    const upserted: Record<string, unknown>[] = [];
    if (updateRows.length > 0) {
      const { data, error } = await supabase
        .from("students")
        .upsert(updateRows)
        .select();
      if (error) throw new Error(error.message);
      upserted.push(...(data ?? []));
    }
    if (insertRows.length > 0) {
      const { data, error } = await supabase
        .from("students")
        .insert(insertRows)
        .select();
      if (error) throw new Error(error.message);
      upserted.push(...(data ?? []));
    }
    return finishImport(
      supabase,
      classId,
      upserted,
      existingIds,
      false,
      [],
      new Set(),
    );
  });

  if (result.success && typeof input.classId === "string") {
    revalidatePath(`/classes/${input.classId}`);
  }
  return result;
}

type SupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

/** Shared tail of both match modes: grade init, replace-mode cleanup, counts. */
async function finishImport(
  supabase: SupabaseClient,
  classId: string,
  upserted: Record<string, unknown>[],
  existingIds: Set<string>,
  replace: boolean,
  skipped: SkippedStudentGroup[],
  preserveIds: Set<string>,
): Promise<ImportStudentsSummary> {
  const upsertedIds = upserted.map((s) => s.id as string);
  const newIds = upsertedIds.filter((id) => !existingIds.has(id));

  await initializeGradesForClassStudents(supabase, classId, upsertedIds);

  const keepIds = [...new Set([...upsertedIds, ...preserveIds])];
  const deleted = replace
    ? await removeStudentsNotIn(supabase, classId, keepIds)
    : 0;

  return {
    inserted: newIds.length,
    updated: upsertedIds.length - newIds.length,
    deleted,
    skipped,
  };
}

/**
 * Replace mode: delete every class student absent from the imported
 * file. attendanceRecords and grades cascade via FK; Rekognition face
 * vectors and avatar objects are cleaned up best-effort afterwards.
 */
async function removeStudentsNotIn(
  supabase: SupabaseClient,
  classId: string,
  keepIds: string[],
): Promise<number> {
  const { data: all, error } = await supabase
    .from("students")
    .select("id, awsFaceId, avatarKey")
    .eq("classId", classId);
  if (error) throw new Error(error.message);

  const removed = (all ?? []).filter((s) => !keepIds.includes(s.id as string));
  if (removed.length === 0) return 0;

  const { error: deleteError } = await supabase
    .from("students")
    .delete()
    .eq("classId", classId)
    .in(
      "id",
      removed.map((s) => s.id as string),
    );
  if (deleteError) throw new Error(deleteError.message);

  await Promise.all(
    removed.flatMap((s) => {
      const jobs: Promise<void>[] = [];
      if (s.awsFaceId) {
        jobs.push(deleteFaceVector(classId, s.awsFaceId as string));
      }
      if (s.avatarKey) jobs.push(deleteObject(s.avatarKey as string));
      return jobs;
    }),
  );

  return removed.length;
}
