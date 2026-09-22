"use server";

import { revalidatePath } from "next/cache";
import { deleteFaceVector } from "@lib/rekognition";
import { deleteObject } from "@lib/storage";
import { deleteStudentSchema } from "@schemas";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/**
 * Server Action: delete one student. Same cleanup as the import's
 * replace mode (removeStudentsNotIn): attendanceRecords and grades
 * cascade via FK; the Rekognition face vector and avatar object are
 * removed best-effort afterwards. Ownership is enforced by RLS
 * (teacher must own the class).
 */
export async function deleteStudent(
  studentId: unknown,
): Promise<ActionResult<void>> {
  let classId: string | null = null;

  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = deleteStudentSchema.safeParse(studentId);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Học sinh không hợp lệ");
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("id, classId, awsFaceId, avatarKey")
      .eq("id", parsed.data)
      .single();
    if (error || !student) throw new Error("Không tìm thấy học sinh");
    classId = student.classId as string;

    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id as string);
    if (deleteError) throw new Error(deleteError.message);

    const jobs: Promise<void>[] = [];
    if (student.awsFaceId) {
      jobs.push(deleteFaceVector(classId, student.awsFaceId as string));
    }
    if (student.avatarKey) {
      jobs.push(deleteObject(student.avatarKey as string));
    }
    await Promise.all(jobs);
  });

  if (result.success && classId) revalidatePath(`/classes/${classId}`);
  return result;
}
