"use server";

import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { initializeGradesForClassStudents } from "@lib/grades";
import { deleteFaceVector } from "@lib/rekognition";
import { deleteObject } from "@lib/storage";
import { removeDiacritics } from "@lib/string";
import { createSupabaseServerClient } from "@lib/supabase";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

dayjs.extend(customParseFormat);

export interface ImportStudentsSummary {
  inserted: number;
  updated: number;
  deleted: number;
}

interface CsvRow {
  studentCode: string | null;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
}

interface StudentWriteRow {
  classId: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
  studentCode: string | null;
}

/** Diacritic-insensitive "Họ đệm Tên" key for name-based dedupe. */
function nameKey(lastName: string, firstName: string): string {
  return removeDiacritics(`${lastName} ${firstName}`)
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = dayjs(value.trim(), [
    "YYYY-MM-DD",
    "YYYY-M-D",
    "MM/DD/YYYY",
    "M/D/YYYY",
  ]);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

/**
 * Parse CSV text: studentCode,lastName,firstName,dateOfBirth(optional).
 * studentCode may be left empty — the column position stays the same.
 * Accepted date formats: YYYY-MM-DD, YYYY-M-D, MM/DD/YYYY, M/D/YYYY.
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
      if (cells.length < 3 || !cells[1] || !cells[2]) return [];
      return [
        {
          studentCode: cells[0] || null,
          lastName: cells[1],
          firstName: cells[2],
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

    // Dedupe inside the file itself — last row per match key wins, so
    // a repeated key can't hit "ON CONFLICT cannot affect row twice".
    const deduped = new Map<string, CsvRow>();
    rows.forEach((r, i) => {
      const key =
        matchBy === "name"
          ? nameKey(r.lastName, r.firstName)
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
      return finishImport(supabase, classId, upserted ?? [], existingIds, replace);
    }

    // matchBy === "name": match on normalized "Họ đệm Tên".
    const { data: all, error: allError } = await supabase
      .from("students")
      .select("id, lastName, firstName, studentCode, dateOfBirth")
      .eq("classId", classId);
    if (allError) throw new Error(allError.message);

    interface ExistingStudent {
      id: string;
      studentCode: string | null;
      dateOfBirth: string | null;
    }
    const byName = new Map<string, ExistingStudent>();
    const ownerByCode = new Map<string, string>();
    for (const s of all ?? []) {
      byName.set(nameKey(s.lastName as string, s.firstName as string), {
        id: s.id as string,
        studentCode: (s.studentCode as string | null) ?? null,
        dateOfBirth: (s.dateOfBirth as string | null) ?? null,
      });
      if (s.studentCode) {
        ownerByCode.set(s.studentCode as string, s.id as string);
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
    for (const r of dedupedRows) {
      const existing = byName.get(nameKey(r.lastName, r.firstName));
      if (r.studentCode) {
        const owner = ownerByCode.get(r.studentCode);
        if (
          (owner && owner !== existing?.id) ||
          fileCodes.has(r.studentCode)
        ) {
          throw new Error(
            `Mã học sinh "${r.studentCode}" bị trùng trong lớp`,
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
        // wipe the existing studentCode / dateOfBirth.
        updateRows.push({
          id: existing.id,
          ...base,
          dateOfBirth: r.dateOfBirth ?? existing.dateOfBirth,
          studentCode: r.studentCode ?? existing.studentCode,
        });
      } else {
        insertRows.push({
          ...base,
          dateOfBirth: r.dateOfBirth,
          studentCode: r.studentCode,
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
    return finishImport(supabase, classId, upserted, existingIds, replace);
  });

  if (result.success && typeof classId === "string") {
    revalidatePath(`/classes/${classId}`);
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
): Promise<ImportStudentsSummary> {
  const upsertedIds = upserted.map((s) => s.id as string);
  const newIds = upsertedIds.filter((id) => !existingIds.has(id));

  await initializeGradesForClassStudents(supabase, classId, upsertedIds);

  const deleted = replace
    ? await removeStudentsNotIn(supabase, classId, upsertedIds)
    : 0;

  return {
    inserted: newIds.length,
    updated: upsertedIds.length - newIds.length,
    deleted,
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
