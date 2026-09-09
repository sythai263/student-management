"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Subject } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Tên môn học không được trống").max(100),
  code: z.string().trim().max(20).optional(),
});

/** Server Action: create a subject owned by the current teacher. */
export async function createSubject(
  input: unknown,
): Promise<ActionResult<Subject>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = createSubjectSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({ ...parsed.data, teacherId: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Subject;
  });

  if (result.success) revalidatePath("/subjects");
  return result;
}

/** Server Action: delete a subject owned by the current teacher. */
export async function deleteSubject(
  id: unknown,
): Promise<ActionResult<void>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = z.string().uuid("ID môn học không hợp lệ").safeParse(id);
    if (!parsed.success) throw new Error(parsed.error.message);

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", parsed.data)
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);
  });

  if (result.success) revalidatePath("/subjects");
  return result;
}
