"use server";

import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { initializeGradesForClassStudents } from "@lib/grades";
import type { Student } from "@types";
import {
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
  studentCode: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
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
      if (cells.length < 3 || !cells[0] || !cells[1] || !cells[2]) return [];
      return [
        {
          studentCode: cells[0],
          lastName: cells[1],
          firstName: cells[2],
          dateOfBirth: parseDate(cells[3]),
        },
      ];
    });
}

/**
 * Server Action: bulk-import students into a class from a CSV file.
 * Owner check is enforced by RLS (teacher must own the class).
 */
export async function importStudents(
  formData: FormData,
): Promise<ActionResult<ImportStudentsSummary>> {
  const classId = formData.get("classId");

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

    const codes = rows.map((r) => r.studentCode);
    const { data: existing, error: existingError } = await supabase
      .from("students")
      .select("studentCode")
      .eq("classId", classId)
      .in("studentCode", codes);
    if (existingError) throw new Error(existingError.message);

    const existingCodes = new Set(existing?.map((s) => s.studentCode) ?? []);

    const { data: upserted, error } = await supabase
      .from("students")
      .upsert(rows.map((r) => ({ ...r, classId })), {
        onConflict: '"studentCode","classId"',
      })
      .select();
    if (error) throw new Error(error.message);

    const studentIds = (upserted ?? []).map((s) => s.id as string);
    await initializeGradesForClassStudents(supabase, classId as string, studentIds);

    return {
      inserted: rows.length - existingCodes.size,
      updated: existingCodes.size,
    } satisfies ImportStudentsSummary;
  });

  if (result.success && typeof classId === "string") {
    revalidatePath(`/classes/${classId}`);
  }
  return result;
}
