"use server";

import { revalidatePath } from "next/cache";
import type { Class } from "@types";
import { createClassSchema, deleteClassSchema } from "@schemas";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/** Server Action: create a class owned by the current teacher. */
export async function createClass(
  input: unknown,
): Promise<ActionResult<Class>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = createClassSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("classes")
      .insert({ ...parsed.data, teacherId: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Class;
  });

  if (result.success) revalidatePath("/");
  return result;
}

/** Server Action: delete a class and all its dependent data. */
export async function deleteClass(classId: unknown): Promise<ActionResult<void>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const id = deleteClassSchema.safeParse(classId);
    if (!id.success) throw new Error(id.error.issues[0]?.message ?? "Lớp học không hợp lệ");

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id.data)
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);
  });

  if (result.success) revalidatePath("/");
  return result;
}
