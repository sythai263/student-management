"use server";

import { deleteObject } from "@lib/storage";
import type { TeacherSignature } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/**
 * Server Action: save (create or replace) the current teacher's
 * signature. The previous image, if any, is deleted from storage.
 */
export async function saveSignature(
  imageKey: string,
): Promise<ActionResult<TeacherSignature>> {
  return withAction(async () => {
    if (!imageKey || !imageKey.startsWith("signatures/")) {
      throw new Error("Ảnh chữ ký không hợp lệ");
    }

    const { supabase, user } = await requireTeacher();

    const { data: existing } = await supabase
      .from("teacherSignatures")
      .select("imageKey")
      .eq("teacherId", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("teacherSignatures")
      .upsert({ teacherId: user.id, imageKey, updatedAt: new Date().toISOString() })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (existing?.imageKey && existing.imageKey !== imageKey) {
      await deleteObject(existing.imageKey);
    }

    return data as TeacherSignature;
  });
}

/** Server Action: remove the current teacher's saved signature. */
export async function deleteSignature(): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase, user } = await requireTeacher();

    const { data: existing } = await supabase
      .from("teacherSignatures")
      .select("imageKey")
      .eq("teacherId", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("teacherSignatures")
      .delete()
      .eq("teacherId", user.id);
    if (error) throw new Error(error.message);

    if (existing?.imageKey) {
      await deleteObject(existing.imageKey);
    }

    return null;
  });
}
