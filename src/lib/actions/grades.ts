"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SCORE_TYPES } from "@constants";
import type { Grade, GradeSession } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

const uuid = z.string().uuid();

const createGradeSessionSchema = z.object({
  classId: uuid,
  subjectId: uuid,
  semester: z.coerce.number().int().min(1).max(3),
  scoreType: z.enum(SCORE_TYPES),
  name: z.string().trim().min(1, "Tên đợt kiểm tra không được trống").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  weight: z.coerce.number().int().min(1, "Hệ số tối thiểu 1").max(10, "Hệ số tối đa 10").default(1),
});

/** Server Action: create a new grade round and ensure the subject is assigned to the class. */
export async function createGradeSession(
  input: unknown,
): Promise<ActionResult<GradeSession>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = createGradeSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { classId, subjectId, ...sessionData } = parsed.data;

    const { data: session, error: sessionError } = await supabase
      .from("gradeSessions")
      .insert({ classId, subjectId, ...sessionData })
      .select()
      .single();
    if (sessionError) throw new Error(sessionError.message);

    // Ensure the subject is assigned to the class (idempotent).
    const { error: assignError } = await supabase
      .from("classSubjects")
      .upsert({ classId, subjectId }, { onConflict: '"classId","subjectId"' });
    if (assignError) throw new Error(assignError.message);

    return session as GradeSession;
  });

  if (result.success) {
    revalidatePath(`/classes/${result.data.classId}/grades`);
  }
  return result;
}

const gradeRowSchema = z.object({
  studentId: uuid,
  score: z.coerce
    .number()
    .min(0, "Điểm tối thiểu 0")
    .max(10, "Điểm tối đa 10"),
  note: z.string().trim().max(255).optional(),
});

const saveGradesSchema = z.object({
  gradeSessionId: uuid,
  grades: z.array(gradeRowSchema).min(1, "Chưa có điểm nào"),
});

/** Server Action: save or update grades for a round in one batch. */
export async function saveGradesBulk(
  input: unknown,
): Promise<ActionResult<Grade[]>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = saveGradesSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { gradeSessionId, grades } = parsed.data;

    const { data: session, error: sessionError } = await supabase
      .from("gradeSessions")
      .select("classId,subjectId,semester,scoreType,weight,closed")
      .eq("id", gradeSessionId)
      .single();
    if (sessionError) throw new Error(sessionError.message);
    if (!session) throw new Error("Không tìm thấy đợt kiểm tra");
    if (session.closed) throw new Error("Đợt kiểm tra đã đóng, không thể sửa");

    const rows = grades.map((g) => ({
      gradeSessionId,
      studentId: g.studentId,
      classId: session.classId as string,
      subjectId: session.subjectId as string,
      semester: session.semester as number,
      scoreType: session.scoreType as string,
      weight: session.weight as number,
      score: g.score,
      note: g.note ?? null,
    }));

    const { data, error } = await supabase
      .from("grades")
      .upsert(rows, { onConflict: '"gradeSessionId","studentId"' })
      .select();
    if (error) throw new Error(error.message);

    return (data ?? []) as Grade[];
  });

  if (result.success) {
    revalidatePath(`/classes/${result.data[0]?.classId}/grades/${result.data[0]?.gradeSessionId}`);
  }
  return result;
}

/** Server Action: close a grade round so its scores can no longer be edited. */
export async function closeGradeSession(
  sessionId: string,
): Promise<ActionResult<null>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();
    const { error } = await supabase
      .from("gradeSessions")
      .update({ closed: true })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);
    return null;
  });

  return result;
}

export interface ImportGradesSummary {
  inserted: number;
  skipped: number;
}

interface CsvRow {
  studentCode: string;
  score: number;
  note: string | null;
}

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
      if (cells.length < 2 || !cells[0] || cells[1] === "") return [];
      const score = Number(cells[1].replace(",", "."));
      if (Number.isNaN(score) || score < 0 || score > 10) return [];
      return [
        {
          studentCode: cells[0],
          score,
          note: cells[2] || null,
        },
      ];
    });
}

/** Server Action: bulk-import grades for a round from a CSV file. */
export async function importGrades(
  formData: FormData,
): Promise<ActionResult<ImportGradesSummary>> {
  const gradeSessionId = formData.get("gradeSessionId");

  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    if (typeof gradeSessionId !== "string" || gradeSessionId.length === 0) {
      throw new Error("Thiếu gradeSessionId");
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Thiếu file CSV");
    }

    const { data: session, error: sessionError } = await supabase
      .from("gradeSessions")
      .select("classId,subjectId,semester,scoreType,weight,closed")
      .eq("id", gradeSessionId)
      .single();
    if (sessionError) throw new Error(sessionError.message);
    if (!session) throw new Error("Không tìm thấy đợt kiểm tra");
    if (session.closed) throw new Error("Đợt kiểm tra đã đóng");

    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      throw new Error("File CSV không có dữ liệu hợp lệ");
    }

    const codes = rows.map((r) => r.studentCode);
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id,studentCode")
      .eq("classId", session.classId as string)
      .in("studentCode", codes);
    if (studentsError) throw new Error(studentsError.message);

    const studentByCode = new Map(
      (students ?? []).map((s) => [s.studentCode, s.id as string]),
    );

    const validRows = rows.filter((r) => studentByCode.has(r.studentCode));
    if (validRows.length === 0) {
      throw new Error("Không tìm thấy mã học sinh nào khớp trong lớp");
    }

    const gradeRows = validRows.map((r) => ({
      gradeSessionId,
      studentId: studentByCode.get(r.studentCode) as string,
      classId: session.classId as string,
      subjectId: session.subjectId as string,
      semester: session.semester as number,
      scoreType: session.scoreType as string,
      weight: session.weight as number,
      score: r.score,
      note: r.note,
    }));

    const { error } = await supabase
      .from("grades")
      .upsert(gradeRows, { onConflict: '"gradeSessionId","studentId"' });
    if (error) throw new Error(error.message);

    return {
      inserted: validRows.length,
      skipped: rows.length - validRows.length,
    } satisfies ImportGradesSummary;
  });

  return result;
}
