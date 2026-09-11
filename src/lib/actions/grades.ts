"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Grade } from "@types";
import { parseGradeCsv, calculateAverage } from "@lib/grade-utils";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

export interface ImportGradesError {
  lineNo: number;
  studentCode: string | null;
  message: string;
}

const uuid = z.string().uuid();

const scoreValueSchema = z
  .number()
  .min(0, "Điểm tối thiểu 0")
  .max(10, "Điểm tối đa 10")
  .optional()
  .nullable();

const gradeRowSchema = z.object({
  studentId: uuid,
  tx1: scoreValueSchema.nullable(),
  tx2: scoreValueSchema.nullable(),
  tx3: scoreValueSchema.nullable(),
  tx4: scoreValueSchema.nullable(),
  gk: scoreValueSchema.nullable(),
  ck: scoreValueSchema.nullable(),
  note: z.string().trim().max(255).optional().nullable(),
  comment: z.string().trim().max(500).optional().nullable(),
});

const saveGradesSchema = z.object({
  classId: uuid,
  subjectId: uuid,
  semester: z.coerce.number().int().min(1).max(2, "Học kỳ chỉ là 1 hoặc 2"),
  grades: z.array(gradeRowSchema).min(1, "Chưa có điểm nào"),
});

function countRegularScores(row: z.infer<typeof gradeRowSchema>) {
  return [row.tx1, row.tx2, row.tx3, row.tx4].filter((v) => v != null).length;
}

/** Server Action: save or update the full 6-score grade sheet for a class/subject/semester. */
export async function saveGradesBulk(
  input: unknown,
): Promise<ActionResult<Grade[]>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = saveGradesSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { classId, subjectId, semester, grades } = parsed.data;

    // Enforce business rules per row.
    for (const row of grades) {
      if (countRegularScores(row) < 2) {
        throw new Error("Mỗi học sinh cần ít nhất 2 điểm thường xuyên");
      }
    }

    const rows = grades.map((g) => ({
      classId,
      subjectId,
      semester,
      studentId: g.studentId,
      tx1: g.tx1 ?? null,
      tx2: g.tx2 ?? null,
      tx3: g.tx3 ?? null,
      tx4: g.tx4 ?? null,
      gk: g.gk ?? null,
      ck: g.ck ?? null,
      averageScore: calculateAverage({
        tx1: g.tx1,
        tx2: g.tx2,
        tx3: g.tx3,
        tx4: g.tx4,
        gk: g.gk,
        ck: g.ck,
      }),
      note: g.note ?? null,
      comment: g.comment ?? null,
    }));

    const { data, error } = await supabase
      .from("grades")
      .upsert(rows, { onConflict: '"classId","subjectId","semester","studentId"' })
      .select();
    if (error) throw new Error(error.message);

    return (data ?? []) as Grade[];
  });

  if (result.success) {
    const first = result.data[0];
    if (first) {
      revalidatePath(`/classes/${first.classId}/grades`);
    }
  }
  return result;
}

export interface ImportGradesSummary {
  inserted: number;
  skipped: number;
  errors: ImportGradesError[];
}

const importGradesSchema = z.object({
  classId: uuid,
  subjectId: uuid,
  semester: z.coerce.number().int().min(1).max(2, "Học kỳ chỉ là 1 hoặc 2"),
});

/** Server Action: bulk-import 6-score grades from a CSV file. */
export async function importGrades(
  formData: FormData,
): Promise<ActionResult<ImportGradesSummary>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const classId = formData.get("classId");
    const subjectId = formData.get("subjectId");
    const semester = formData.get("semester");
    const file = formData.get("file");

    const parsed = importGradesSchema.safeParse({
      classId,
      subjectId,
      semester,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Thiếu file CSV");
    }

    const { rows, hasHeader } = parseGradeCsv(await file.text());
    if (rows.length === 0) {
      throw new Error(hasHeader ? "File CSV không có dòng dữ liệu" : "File CSV không có dữ liệu hợp lệ");
    }

    const codes = rows.map((r) => r.studentCode).filter((c): c is string => c != null && c !== "");
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id,studentCode")
      .eq("classId", parsed.data.classId)
      .in("studentCode", codes);
    if (studentsError) throw new Error(studentsError.message);

    const studentByCode = new Map(
      (students ?? []).map((s) => [s.studentCode as string, s.id as string]),
    );

    const gradeRows: Record<string, unknown>[] = [];
    const errors: ImportGradesError[] = [];

    for (const row of rows) {
      const messages: string[] = [];
      const studentCode = row.studentCode?.trim();

      if (!studentCode) {
        messages.push("Thiếu mã học sinh");
      } else if (!studentByCode.has(studentCode)) {
        messages.push(`Mã học sinh ${studentCode} không có trong lớp`);
      }

      if (row.invalidScores.length > 0) {
        messages.push(`Điểm không hợp lệ: ${row.invalidScores.join(", ")}`);
      }

      const regularCount = [row.scores.tx1, row.scores.tx2, row.scores.tx3, row.scores.tx4].filter(
        (v) => v != null,
      ).length;
      if (regularCount > 0 && regularCount < 2) {
        messages.push("Cần ít nhất 2 điểm thường xuyên");
      }

      const hasAnyScore =
        regularCount > 0 || row.scores.gk != null || row.scores.ck != null;
      if (!hasAnyScore) {
        messages.push("Không có điểm nào");
      }

      if (messages.length > 0) {
        errors.push({
          lineNo: row.lineNo,
          studentCode: studentCode ?? row.fullName,
          message: messages.join("; "),
        });
        continue;
      }

      const averageScore = calculateAverage(row.scores);

      gradeRows.push({
        classId: parsed.data.classId,
        subjectId: parsed.data.subjectId,
        semester: parsed.data.semester,
        studentId: studentByCode.get(studentCode as string) as string,
        ...row.scores,
        averageScore,
        note: row.note,
        comment: row.comment,
      });
    }

    if (gradeRows.length > 0) {
      const { error } = await supabase
        .from("grades")
        .upsert(gradeRows, { onConflict: '"classId","subjectId","semester","studentId"' });
      if (error) throw new Error(error.message);
    }

    return {
      inserted: gradeRows.length,
      skipped: errors.length,
      errors,
    } satisfies ImportGradesSummary;
  });

  return result;
}
