"use server";

import { deleteFaceVector, indexStudentFace } from "@lib/rekognition";
import { updateStudentSchema } from "@schemas";
import type { Student } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/**
 * Server Action: Update Student.
 * Edits name/dateOfBirth and, when a new portrait is attached, runs the
 * same pipeline as register-student: upload to S3, IndexFaces with
 * ExternalImageId = studentCode, then swap awsFaceId + avatarUrl on the row.
 */
export async function updateStudent(
  formData: FormData,
): Promise<ActionResult<Student>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = updateStudentSchema.safeParse({
      studentId: formData.get("studentId"),
      lastName: formData.get("lastName"),
      firstName: formData.get("firstName"),
      dateOfBirth: formData.get("dateOfBirth") || undefined,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }
    const input = parsed.data;

    const { data: existing, error: fetchError } = await supabase
      .from("students")
      .select("id, classId, studentCode, awsFaceId")
      .eq("id", input.studentId)
      .single();
    if (fetchError || !existing) throw new Error("Không tìm thấy học sinh");

    const classId = existing.classId as string;

    // Optional new portrait -> re-index the face under the same
    // studentCode. Both keys point at files already uploaded directly
    // to storage by the client (see `uploadDirect`).
    const imageKey = formData.get("imageKey");
    const avatarKey = formData.get("avatarKey");
    const face =
      typeof imageKey === "string" &&
        imageKey.length > 0 &&
        typeof avatarKey === "string" &&
        avatarKey.length > 0
        ? await indexStudentFace(
          classId,
          existing.studentCode as string,
          imageKey,
          avatarKey,
        )
        : null;

    const { data: student, error } = await supabase
      .from("students")
      .update({
        lastName: input.lastName,
        firstName: input.firstName,
        dateOfBirth: input.dateOfBirth ?? null,
        ...(face
          ? { awsFaceId: face.awsFaceId, avatarUrl: face.avatarUrl }
          : {}),
      })
      .eq("id", existing.id as string)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Re-indexed face: drop the old vector so stale faces don't accumulate.
    if (face && existing.awsFaceId) {
      await deleteFaceVector(classId, existing.awsFaceId as string);
    }

    return student as Student;
  });
}
