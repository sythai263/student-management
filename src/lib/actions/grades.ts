"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Grade } from "@types";
import { calculateAverage } from "@lib/grade-utils";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

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
}

interface CsvRow {
  studentCode: string;
  tx1: number | null;
  tx2: number | null;
  tx3: number | null;
  tx4: number | null;
  gk: number | null;
  ck: number | null;
  note: string | null;
  comment: string | null;
}

function parseScore(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const score = Number(value.trim().replace(",", "."));
  if (Number.isNaN(score) || score < 0 || score > 10) return null;
  return score;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let startIndex = 0;
  const first = lines[0]?.split(",").map((c) => c.trim().toLowerCase()) ?? [];
  if (
    first[0] === "mahs" ||
    first[0] === "mã hs" ||
    first[0] === "studentcode" ||
    first[0] === "ma hs"
  ) {
    startIndex = 1;
  }

  return lines.slice(startIndex).flatMap((line) => {
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length < 2 || !cells[0]) return [];
    const studentCode = cells[0];
    const tx1 = parseScore(cells[1] ?? "");
    const tx2 = parseScore(cells[2] ?? "");
    const tx3 = parseScore(cells[3] ?? "");
    const tx4 = parseScore(cells[4] ?? "");
    const gk = parseScore(cells[5] ?? "");
    const ck = parseScore(cells[6] ?? "");
    const note = cells[7] || null;
    const comment = cells[8] || null;

    if (tx1 == null && tx2 == null && tx3 == null && tx4 == null && gk == null && ck == null) {
      return [];
    }
    return [{ studentCode, tx1, tx2, tx3, tx4, gk, ck, note, comment }];
  });
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

    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      throw new Error("File CSV không có dữ liệu hợp lệ");
    }

    const codes = rows.map((r) => r.studentCode);
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id,studentCode")
      .eq("classId", parsed.data.classId)
      .in("studentCode", codes);
    if (studentsError) throw new Error(studentsError.message);

    const studentByCode = new Map(
      (students ?? []).map((s) => [s.studentCode, s.id as string]),
    );

    const validRows = rows.filter((r) => studentByCode.has(r.studentCode));
    if (validRows.length === 0) {
      throw new Error("Không tìm thấy mã học sinh nào khớp trong lớp");
    }

    // Enforce business rules.
    for (const row of validRows) {
      const regularCount = [row.tx1, row.tx2, row.tx3, row.tx4].filter((v) => v != null).length;
      if (regularCount < 2) {
        throw new Error(`Học sinh ${row.studentCode} cần ít nhất 2 điểm thường xuyên`);
      }
    }

    const gradeRows = validRows.map((r) => ({
      classId: parsed.data.classId,
      subjectId: parsed.data.subjectId,
      semester: parsed.data.semester,
      studentId: studentByCode.get(r.studentCode) as string,
      tx1: r.tx1,
      tx2: r.tx2,
      tx3: r.tx3,
      tx4: r.tx4,
      gk: r.gk,
      ck: r.ck,
      averageScore: calculateAverage({
        tx1: r.tx1,
        tx2: r.tx2,
        tx3: r.tx3,
        tx4: r.tx4,
        gk: r.gk,
        ck: r.ck,
      }),
      note: r.note,
      comment: r.comment,
    }));

    const { error } = await supabase
      .from("grades")
      .upsert(gradeRows, { onConflict: '"classId","subjectId","semester","studentId"' });
    if (error) throw new Error(error.message);

    return {
      inserted: validRows.length,
      skipped: rows.length - validRows.length,
    } satisfies ImportGradesSummary;
  });

  return result;
}
