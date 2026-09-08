"use server";

import { revalidatePath } from "next/cache";
import type { Student } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

export interface ImportStudentsSummary {
  inserted: number;
  skipped: number;
}

interface CsvRow {
  studentCode: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
}

/**
 * Parse CSV text: studentCode,lastName,firstName,dateOfBirth(optional).
 * Skips a header row if the first cell is not a plausible code.
 */
function parseCsv(text: string): CsvRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const cells = line.split(",").map((c) => c.trim());
      if (index === 0 && cells[0]?.toLowerCase().includes("code")) return [];
      if (cells.length < 3 || !cells[0]) return [];
      return [
        {
          studentCode: cells[0],
          lastName: cells[1],
          firstName: cells[2],
          dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(cells[3] ?? "")
            ? cells[3]
            : null,
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
      throw new Error("Thiếu classId");
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Thiếu file CSV");
    }

    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      throw new Error("File CSV không có dữ liệu hợp lệ");
    }

    const { data, error } = await supabase
      .from("students")
      .insert(rows.map((r) => ({ ...r, classId })))
      .select("id");
    if (error) throw new Error(error.message);

    return {
      inserted: (data as Pick<Student, "id">[] | null)?.length ?? 0,
      skipped: 0,
    } satisfies ImportStudentsSummary;
  });

  if (result.success && typeof classId === "string") {
    revalidatePath(`/classes/${classId}`);
  }
  return result;
}
