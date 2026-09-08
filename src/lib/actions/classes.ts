"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Class } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

const createClassSchema = z.object({
  classCode: z
    .string()
    .trim()
    .min(1, "Mã lớp không được trống")
    .max(20, "Mã lớp tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9]+$/, "Mã lớp chỉ gồm chữ và số"),
  name: z.string().trim().min(1, "Tên lớp không được trống"),
  schoolYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Năm học theo định dạng YYYY-YYYY"),
});

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

    const id = z.string().uuid().safeParse(classId);
    if (!id.success) throw new Error("ID lớp không hợp lệ");

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
