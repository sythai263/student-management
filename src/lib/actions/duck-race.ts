"use server";

import { z } from "zod";
import type { DuckRaceData, Grade, Student } from "@types";
import { GRADE_SLOTS, type GradeSlot } from "@constants";
import { calculateAverage } from "@lib/grade-utils";
import { compareStudentNames } from "@lib/string";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

const uuid = z.string().uuid();

const gradeScopeSchema = z.object({
  classId: uuid,
  subjectId: uuid,
  semester: z.coerce.number().int().min(1).max(2, "Học kỳ chỉ là 1 hoặc 2"),
  studentId: uuid,
});

const saveRaceGradesSchema = gradeScopeSchema.extend({
  scores: z
    .array(z.coerce.number().min(0, "Điểm tối thiểu 0").max(10, "Điểm tối đa 10"))
    .min(1, "Chưa có điểm nào")
    .max(4, "Tối đa 4 điểm thường xuyên"),
});

/** Server Action: pick a random student for review, weighted toward
 *  those with fewer THUONG_XUYEN grades. Returns the full roster and
 *  the pre-determined winner. */
export async function pickReviewStudent(
  classId: string,
): Promise<ActionResult<DuckRaceData>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!classId) throw new Error("Thiếu thông tin lớp học");

    const { data: fetched, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("classId", classId);
    if (studentsError) throw new Error(studentsError.message);
    const students = (fetched ?? []).sort((a, b) =>
      compareStudentNames(
        a as { firstName: string; lastName: string },
        b as { firstName: string; lastName: string },
      ),
    );
    if (students.length === 0)
      throw new Error("Lớp chưa có học sinh");

    const ids = students.map((s) => s.id as string);
    const { data: grades, error: gradesError } = await supabase
      .from("grades")
      .select("studentId,tx1,tx2,tx3,tx4")
      .eq("classId", classId)
      .in("studentId", ids);
    if (gradesError) throw new Error(gradesError.message);

    const txCount = new Map<string, number>();
    (grades ?? []).forEach((g) => {
      const id = g.studentId as string;
      const filled = [g.tx1, g.tx2, g.tx3, g.tx4].filter(
        (v) => v != null,
      ).length;
      txCount.set(id, (txCount.get(id) ?? 0) + filled);
    });

    const weights = students.map(
      (s) => 1 / ((txCount.get(s.id) ?? 0) + 1),
    );
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let winnerId = students[0]?.id as string;
    for (let i = 0; i < students.length; i++) {
      r -= weights[i] ?? 0;
      if (r <= 0) {
        winnerId = students[i]?.id as string;
        break;
      }
    }

    return {
      students: students as Student[],
      winnerId,
    } satisfies DuckRaceData;
  });
}

function isGradeSlot(key: string): key is GradeSlot {
  return GRADE_SLOTS.includes(key as GradeSlot);
}

/** Server Action: fetch a single grade row for the race-grade modal. */
export async function getGradeForRace(
  input: unknown,
): Promise<ActionResult<{ grade: Partial<Grade>; emptySlots: GradeSlot[] }>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = gradeScopeSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { classId, subjectId, semester, studentId } = parsed.data;

    const { data, error } = await supabase
      .from("grades")
      .select("id,tx1,tx2,tx3,tx4,gk,ck,averageScore,note,comment")
      .eq("classId", classId)
      .eq("subjectId", subjectId)
      .eq("semester", semester)
      .eq("studentId", studentId)
      .single();

    const grade = (data ?? {}) as Partial<Grade>;

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    const emptySlots = GRADE_SLOTS.filter(
      (slot): slot is Exclude<GradeSlot, "gk" | "ck"> =>
        slot !== "gk" && slot !== "ck" && grade[slot] == null,
    );

    return { grade, emptySlots };
  });
}

/** Server Action: save scores from the race review into the first empty
 *  regular-score slots (tx1..tx4) of a single grade row. */
export async function saveRaceGrades(
  input: unknown,
): Promise<ActionResult<Grade>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = saveRaceGradesSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { classId, subjectId, semester, studentId, scores } = parsed.data;

    const { data: existing, error: existingError } = await supabase
      .from("grades")
      .select("id,tx1,tx2,tx3,tx4,gk,ck")
      .eq("classId", classId)
      .eq("subjectId", subjectId)
      .eq("semester", semester)
      .eq("studentId", studentId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      throw new Error(existingError.message);
    }

    const updates: Partial<Record<GradeSlot, number | null>> = {};
    let scoreIdx = 0;
    for (const slot of GRADE_SLOTS) {
      if (slot === "gk" || slot === "ck") continue;
      if (existing?.[slot] == null && scoreIdx < scores.length) {
        updates[slot] = scores[scoreIdx++];
      }
    }

    if (scoreIdx !== scores.length) {
      throw new Error("Không còn ô điểm thường xuyên trống để lưu");
    }

    const base = { ...existing, ...updates } as Partial<Grade>;
    const averageScore = calculateAverage({
      tx1: base.tx1,
      tx2: base.tx2,
      tx3: base.tx3,
      tx4: base.tx4,
      gk: base.gk,
      ck: base.ck,
    });

    if (existing) {
      const { data, error } = await supabase
        .from("grades")
        .update({ ...updates, averageScore })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Grade;
    }

    const { data, error } = await supabase
      .from("grades")
      .insert({
        classId,
        subjectId,
        semester,
        studentId,
        tx1: null,
        tx2: null,
        tx3: null,
        tx4: null,
        gk: null,
        ck: null,
        note: null,
        comment: null,
        ...updates,
        averageScore,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Grade;
  });
}
