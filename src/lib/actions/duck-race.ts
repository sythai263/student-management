"use server";

import type { DuckRaceData, Student } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/** Server Action: pick a random student for review, weighted toward
 *  those with fewer THUONG_XUYEN grades. Returns the full roster and
 *  the pre-determined winner. */
export async function pickReviewStudent(
  classId: string,
): Promise<ActionResult<DuckRaceData>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!classId) throw new Error("Thiếu classId");

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("classId", classId)
      .order("studentCode");
    if (studentsError) throw new Error(studentsError.message);
    if (!students || students.length === 0) throw new Error("Lớp chưa có học sinh");

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
      const filled = [g.tx1, g.tx2, g.tx3, g.tx4].filter((v) => v != null).length;
      txCount.set(id, (txCount.get(id) ?? 0) + filled);
    });

    const weights = students.map((s) => 1 / ((txCount.get(s.id) ?? 0) + 1));
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
