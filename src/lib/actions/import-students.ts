"use server";

import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { initializeGradesForClassStudents } from "@lib/grades";
import { removeDiacritics } from "@lib/string";
import { createSupabaseServerClient } from "@lib/supabase";
import {
  addStudentsToAllSessions,
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

dayjs.extend(customParseFormat);

export interface ImportStudentsSummary {
  inserted: number;
  updated: number;
}

interface CsvRow {
  studentCode: string | null;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
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
 * "name" = diacritic-insensitive Họ đệm + Tên). Owner check is
 * enforced by RLS (teacher must own the class).
 */
export async function importStudents(
  formData: FormData,
): Promise<ActionResult<ImportStudentsSummary>> {
  const classId = formData.get("classId");
  const matchBy = formData.get("matchBy") === "name" ? "name" : "code";
  const addToAllSessions = formData.get("addToAllSessions") === "on";

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
      if (codes.length > 0) {
        const { data: existing, error: existingError } = await supabase
          .from("students")
          .select("id, studentCode")
          .eq("classId", classId)
          .in("studentCode", codes);
        if (existingError) throw new Error(existingError.message);
        for (const s of existing ?? []) existingIds.add(s.id as string);
      }

      const { data: upserted, error } = await supabase
        .from("students")
        .upsert(
          dedupedRows.map((r) => ({ ...r, classId })),
          { onConflict: '"studentCode","classId"' },
        )
        .select();
      if (error) throw new Error(error.message);
      return finishImport(supabase, classId, upserted ?? [], existingIds, addToAllSessions);
    }

    // matchBy === "name": match on normalized "Họ đệm Tên".
    const { data: all, error: allError } = await supabase
      .from("students")
      .select("id, lastName, firstName")
      .eq("classId", classId);
    if (allError) throw new Error(allError.message);

    const idByName = new Map<string, string>();
    for (const s of all ?? []) {
      idByName.set(
        nameKey(s.lastName as string, s.firstName as string),
        s.id as string,
      );
    }

    const upsertRows = dedupedRows.map((r) => {
      const id = idByName.get(nameKey(r.lastName, r.firstName));
      if (id) existingIds.add(id);
      const base = {
        classId,
        lastName: r.lastName,
        firstName: r.firstName,
        dateOfBirth: r.dateOfBirth,
      };
      // On update, studentCode is only written when the file provides
      // one — a blank cell must not wipe an existing code.
      return id
        ? { id, ...base, ...(r.studentCode ? { studentCode: r.studentCode } : {}) }
        : { ...base, studentCode: r.studentCode };
    });

    const { data: upserted, error } = await supabase
      .from("students")
      .upsert(upsertRows)
      .select();
    if (error) throw new Error(error.message);
    return finishImport(supabase, classId, upserted ?? [], existingIds, addToAllSessions);
  });

  if (result.success && typeof classId === "string") {
    revalidatePath(`/classes/${classId}`);
  }
  return result;
}

type SupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

/** Shared tail of both match modes: grade init, optional session back-fill, counts. */
async function finishImport(
  supabase: SupabaseClient,
  classId: string,
  upserted: Record<string, unknown>[],
  existingIds: Set<string>,
  addToAllSessions: boolean,
): Promise<ImportStudentsSummary> {
  const upsertedIds = upserted.map((s) => s.id as string);
  const newIds = upsertedIds.filter((id) => !existingIds.has(id));

  if (addToAllSessions && newIds.length > 0) {
    await addStudentsToAllSessions(classId, newIds);
  }

  await initializeGradesForClassStudents(supabase, classId, upsertedIds);

  return {
    inserted: newIds.length,
    updated: upsertedIds.length - newIds.length,
  };
}
