"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TeacherSchool } from "@types";
import { createSchoolSchema, renameSchoolSchema } from "@schemas";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/** Server Action: add a school to the current teacher's list. */
export async function createSchool(
  input: unknown,
): Promise<ActionResult<TeacherSchool>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = createSchoolSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("teacherSchools")
      .insert({ ...parsed.data, teacherId: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as TeacherSchool;
  });

  if (result.success) revalidatePath("/classes");
  return result;
}

/** Server Action: rename one of the current teacher's schools. */
export async function renameSchool(
  input: unknown,
): Promise<ActionResult<TeacherSchool>> {
  return withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = renameSchoolSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("teacherSchools")
      .update({ name: parsed.data.name })
      .eq("id", parsed.data.id)
      .eq("teacherId", user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as TeacherSchool;
  });
}

/**
 * Server Action: delete a school. Classes mapped to it are unmapped
 * automatically (`on delete set null`).
 */
export async function deleteSchool(id: unknown): Promise<ActionResult<void>> {
  const result = await withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const parsed = z.string().uuid("Trường không hợp lệ").safeParse(id);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { error } = await supabase
      .from("teacherSchools")
      .delete()
      .eq("id", parsed.data)
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);
  });

  if (result.success) revalidatePath("/classes");
  return result;
}
