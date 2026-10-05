"use server";

import { revalidatePath } from "next/cache";
import { initializeGradesForClassStudents } from "@lib/grades";
import { deleteFaceVector } from "@lib/rekognition";
import { deleteObject } from "@lib/storage";
import { nextStudentCode } from "@lib/student-code";
import {
  buildSkippedGroups,
  dedupeRows,
  indexRoster,
  matchRows,
  parseSheet,
  planWrites,
  type ImportRow,
  type RosterStudent,
  type SkippedStudentGroup,
  type WritePlan,
} from "@lib/student-import";
import { createSupabaseServerClient } from "@lib/supabase";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

export type {
  SkippedStudentRow,
  SkippedStudentGroup,
} from "@lib/student-import";

export interface ImportStudentsSummary {
  inserted: number;
  updated: number;
  deleted: number;
  /** Ambiguous-name groups skipped — teacher registers them by hand. */
  skipped: SkippedStudentGroup[];
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

type SupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

/**
 * classCode prefixes every auto-generated studentCode; fetching it
 * also proves ownership early (RLS hides other teachers' classes).
 */
async function fetchClassCode(
  supabase: SupabaseClient,
  classId: string,
): Promise<string> {
  const { data: cls, error } = await supabase
    .from("classes")
    .select("classCode")
    .eq("id", classId)
    .single();
  if (error) throw new Error("Không tìm thấy lớp học");
  return cls.classCode as string;
}

async function fetchRoster(
  supabase: SupabaseClient,
  classId: string,
): Promise<RosterStudent[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, lastName, firstName, nameSuffix, studentCode, dateOfBirth")
    .eq("classId", classId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id as string,
    lastName: s.lastName as string,
    firstName: s.firstName as string,
    nameSuffix: (s.nameSuffix as string | null) ?? null,
    dateOfBirth: (s.dateOfBirth as string | null) ?? null,
    studentCode: (s.studentCode as string | null) ?? null,
  }));
}

/**
 * Execute a WritePlan: vacate freed codes first (Postgres checks the
 * (studentCode, classId) unique constraint per row, so a swap fails
 * mid-batch unless old codes are nulled — NULLs never conflict), then
 * upsert matches and insert new students as separate batches.
 */
async function applyWritePlan(
  supabase: SupabaseClient,
  plan: WritePlan,
): Promise<Record<string, unknown>[]> {
  if (plan.freedIds.length > 0) {
    const { error } = await supabase
      .from("students")
      .update({ studentCode: null })
      .in("id", plan.freedIds);
    if (error) throw new Error(error.message);
  }

  const upserted: Record<string, unknown>[] = [];
  if (plan.updateRows.length > 0) {
    const { data, error } = await supabase
      .from("students")
      .upsert(plan.updateRows)
      .select();
    if (error) throw new Error(error.message);
    upserted.push(...(data ?? []));
  }
  if (plan.insertRows.length > 0) {
    const { data, error } = await supabase
      .from("students")
      .insert(plan.insertRows)
      .select();
    if (error) throw new Error(error.message);
    upserted.push(...(data ?? []));
  }
  return upserted;
}

/** matchBy === "code": upsert straight on the studentCode unique key. */
async function importByCode(
  supabase: SupabaseClient,
  classId: string,
  classCode: string,
  rows: ImportRow[],
  replace: boolean,
): Promise<ImportStudentsSummary> {
  const dedupedRows = dedupeRows(rows, "code");
  const existingIds = new Set<string>();
  const dobByCode = new Map<string, string | null>();

  const codes = dedupedRows
    .map((r) => r.studentCode)
    .filter((c): c is string => !!c);
  if (codes.length > 0) {
    const { data: existing, error } = await supabase
      .from("students")
      .select("id, studentCode, dateOfBirth")
      .eq("classId", classId)
      .in("studentCode", codes);
    if (error) throw new Error(error.message);
    for (const s of existing ?? []) {
      existingIds.add(s.id as string);
      dobByCode.set(
        s.studentCode as string,
        (s.dateOfBirth as string | null) ?? null,
      );
    }
  }

  // Auto-number codeless new students: "<classCode>-NNNN" continuing
  // the highest code already in use.
  const codeless = dedupedRows.filter((r) => !r.studentCode);
  if (codeless.length > 0) {
    const { data: codeRows, error } = await supabase
      .from("students")
      .select("studentCode")
      .eq("classId", classId);
    if (error) throw new Error(error.message);
    const taken = new Set(codes);
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

/** matchBy === "name": match on normalized "Họ đệm Tên" + nameSuffix. */
async function importByName(
  supabase: SupabaseClient,
  classId: string,
  classCode: string,
  rows: ImportRow[],
  replace: boolean,
): Promise<ImportStudentsSummary> {
  const students = await fetchRoster(supabase, classId);
  const roster = indexRoster(students);
  const { resolved, skippedFileRows, preserveIds } = matchRows(rows, roster);
  const plan = planWrites(resolved, classId, roster.ownerByCode, classCode);
  const upserted = await applyWritePlan(supabase, plan);
  return finishImport(
    supabase,
    classId,
    upserted,
    plan.existingIds,
    replace,
    buildSkippedGroups(skippedFileRows, students),
    preserveIds,
  );
}

/**
 * Server Action: bulk-import students into a class from a CSV/XLSX file.
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

    const rows = await parseSheet(file);
    if (rows.length === 0) {
      throw new Error("Tệp danh sách không có dữ liệu hợp lệ");
    }

    const classCode = await fetchClassCode(supabase, classId);
    return matchBy === "code"
      ? importByCode(supabase, classId, classCode, rows, replace)
      : importByName(supabase, classId, classCode, rows, replace);
  });

  if (result.success && typeof classId === "string") {
    revalidatePath(`/classes/${classId}`);
  }
  return result;
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

    const classCode = await fetchClassCode(supabase, classId);
    const plan = await planResolveRows(supabase, classId, classCode, rows);
    const upserted = await applyWritePlan(supabase, plan);
    return finishImport(
      supabase,
      classId,
      upserted,
      plan.existingIds,
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

/**
 * Build a WritePlan for manually-resolved skipped rows: a mapped id
 * must belong to THIS class and absorb only one row; new students get
 * their distinguishing suffix plus the next sequential code.
 */
async function planResolveRows(
  supabase: SupabaseClient,
  classId: string,
  classCode: string,
  rows: ResolveSkippedRow[],
): Promise<WritePlan> {
  const { data: all, error } = await supabase
    .from("students")
    .select("id, studentCode, nameSuffix, dateOfBirth")
    .eq("classId", classId);
  if (error) throw new Error(error.message);
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

  const plan: WritePlan = {
    updateRows: [],
    insertRows: [],
    freedIds: [],
    existingIds: new Set(),
  };
  const existingCodes = (all ?? []).map(
    (s) => s.studentCode as string | null,
  );
  const taken = new Set<string>();
  for (const r of rows) {
    const existing = r.existingStudentId
      ? roster.get(r.existingStudentId)
      : undefined;
    if (existing && r.existingStudentId) {
      plan.existingIds.add(r.existingStudentId);
      plan.updateRows.push({
        id: r.existingStudentId,
        classId,
        lastName: r.lastName,
        firstName: r.firstName,
        nameSuffix: r.nameSuffix ?? existing.nameSuffix,
        dateOfBirth: r.dateOfBirth ?? existing.dateOfBirth,
        studentCode: existing.studentCode,
      });
    } else {
      plan.insertRows.push({
        classId,
        lastName: r.lastName,
        firstName: r.firstName,
        nameSuffix: r.nameSuffix ?? r.assignedSuffix,
        dateOfBirth: r.dateOfBirth,
        studentCode: nextStudentCode(existingCodes, taken, classCode),
      });
    }
  }
  return plan;
}

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
