"use server";

import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { Student } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

dayjs.extend(customParseFormat);

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

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = dayjs(value.trim(), ["YYYY-MM-DD", "MM/DD/YYYY"]);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

/**
 * Parse CSV text: studentCode,lastName,firstName,dateOfBirth(optional).
 * Accepted date formats: YYYY-MM-DD, MM/DD/YYYY.
 * Skips a header row if the first cell looks like a code label.
 */
function parseCsv(text: string): CsvRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const cells = line.split(",").map((c) => c.trim());
      if (
        index === 0 &&
        /^(ma|student)\s*(hs|code)?$/i.test(cells[0] ?? "")
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
