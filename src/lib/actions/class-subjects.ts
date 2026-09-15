"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ClassSubject } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/** Server Action: link a teacher-owned subject to a teacher-owned class. */
export async function assignSubjectToClass(
  input: unknown,
): Promise<ActionResult<ClassSubject>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = z
      .object({
        classId: z.string().uuid("Lớp học không hợp lệ"),
        subjectId: z.string().uuid("Môn học không hợp lệ"),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("classSubjects")
      .insert({
        classId: parsed.data.classId,
        subjectId: parsed.data.subjectId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ClassSubject;
  });

  return result;
}

/** Server Action: remove a subject assignment from a class. */
export async function removeSubjectFromClass(
  id: unknown,
): Promise<ActionResult<void>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = z.string().uuid("Phân công môn học không hợp lệ").safeParse(id);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { error } = await supabase
      .from("classSubjects")
      .delete()
      .eq("id", parsed.data);
    if (error) throw new Error(error.message);
  });

  return result;
}
