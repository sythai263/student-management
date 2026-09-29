"use server";

import type { StudentViolation } from "@types";
import { createViolationsSchema, deleteViolationSchema } from "@schemas";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/**
 * Server Action: record one violation row per selected student.
 * `recordedAt` is the teacher-machine timestamp sent by the client.
 */
export async function createViolations(
  input: unknown,
): Promise<ActionResult<StudentViolation[]>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = createViolationsSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const recordedAt = new Date(parsed.data.recordedAt).toISOString();
    const rows = parsed.data.studentIds.map((studentId) => ({
      classId: parsed.data.classId,
      studentId,
      content: parsed.data.content,
      recordedAt,
    }));

    const { data, error } = await supabase
      .from("studentViolations")
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []) as StudentViolation[];
  });

  return result;
}

/** Server Action: delete a recorded violation. */
export async function deleteViolation(
  violationId: unknown,
): Promise<ActionResult<void>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const id = deleteViolationSchema.safeParse(violationId);
    if (!id.success) throw new Error(id.error.issues[0]?.message ?? "Bản ghi không hợp lệ");

    const { error } = await supabase
      .from("studentViolations")
      .delete()
      .eq("id", id.data);
    if (error) throw new Error(error.message);
  });

  return result;
}
