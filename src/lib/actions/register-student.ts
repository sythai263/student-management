"use server";

import { randomUUID } from "node:crypto";
import { indexStudentFace, deleteFaceVector } from "@lib/rekognition";
import { registerStudentSchema } from "@schemas";
import { initializeGradesForClassStudents } from "@lib/grades";
import type { Student } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/**
 * Server Action: Register New Student.
 * Flow (per docs/1-project-requirements.md):
 *   1. Client compresses the portrait image (optional), then calls this action.
 *   2. If an image is provided: upload to MinIO (dev) / Cloudflare R2 (prod)
 *      -> storage object key (served via the authenticated /api/image route).
 *   3. AWS Rekognition IndexFaces into the class's Collection,
 *      ExternalImageId = student id (stable — studentCode is optional
 *      and can change as the roster is adjusted).
 *   4. Upsert student row into Supabase: an existing studentCode in the
 *      class gets updated (new image re-indexes the face), otherwise insert.
 *      Past sessions are untouched — a new student simply has no record
 *      there and shows up in "điểm danh bổ sung" if the teacher wants
 *      to mark them.
 */
export async function registerStudent(
  formData: FormData,
): Promise<ActionResult<Student>> {
  return withAction(async () => {
    // --- 1. Auth: must be a logged-in teacher ---
    const { supabase } = await requireTeacher();

    // --- 2. Validate fields ---
    const parsed = registerStudentSchema.safeParse({
      studentCode: formData.get("studentCode") || undefined,
      lastName: formData.get("lastName"),
      firstName: formData.get("firstName"),
      dateOfBirth: formData.get("dateOfBirth") || undefined,
      classId: formData.get("classId"),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }
    const input = parsed.data;

    // --- 3. Existing-student lookup only applies when a code is given;
    //        code-less students are always inserted as new rows. ---
    const existing = input.studentCode
      ? await supabase
        .from("students")
        .select("id, awsFaceId")
        .eq("classId", input.classId)
        .eq("studentCode", input.studentCode)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return data;
        })
      : null;

    // ExternalImageId = student id — known upfront even for new rows.
    const studentId = (existing?.id as string | undefined) ?? randomUUID();

    // Portrait is optional — AWS calls are skipped entirely when no
    // image is provided. Both keys point at files already uploaded
    // directly to storage by the client (see `uploadDirect`).
    const imageKey = formData.get("imageKey");
    const avatarKey = formData.get("avatarKey");
    const face =
      typeof imageKey === "string" &&
        imageKey.length > 0 &&
        typeof avatarKey === "string" &&
        avatarKey.length > 0
        ? await indexStudentFace(
          input.classId,
          studentId,
          imageKey,
          avatarKey,
        )
        : null;

    // --- 5. Upsert student into Supabase (RLS: teacher must own the class) ---
    const baseFields = {
      lastName: input.lastName,
      firstName: input.firstName,
      dateOfBirth: input.dateOfBirth ?? null,
    };
    // Keep the old face data when no new image was provided.
    const faceFields = face
      ? { awsFaceId: face.awsFaceId, avatarKey: face.avatarKey }
      : {};

    const { data: student, error } = existing
      ? await supabase
        .from("students")
        .update({ ...baseFields, ...faceFields })
        .eq("id", existing.id as string)
        .select()
        .single()
      : await supabase
        .from("students")
        .insert({
          id: studentId,
          studentCode: input.studentCode ?? null,
          classId: input.classId,
          ...baseFields,
          awsFaceId: face?.awsFaceId ?? null,
          avatarKey: face?.avatarKey ?? null,
        })
        .select()
        .single();
    if (error) throw new Error(error.message);

    // Re-indexed face: drop the old vector so stale faces don't accumulate.
    if (existing?.awsFaceId && face) {
      await deleteFaceVector(input.classId, existing.awsFaceId as string);
    }

    await initializeGradesForClassStudents(
      supabase,
      input.classId,
      [student.id as string],
    );
    return student as Student;
  });
}
