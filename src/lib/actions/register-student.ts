"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  CreateCollectionCommand,
  IndexFacesCommand,
  ResourceAlreadyExistsException,
} from "@aws-sdk/client-rekognition";
import { createS3Client, getPublicUrl, S3_BUCKET } from "@lib/storage";
import { createRekognitionClient, getCollectionId } from "@lib/rekognition";
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
 *   1. Client compresses the portrait image, then calls this action.
 *   2. Upload image to MinIO (dev) / Cloudflare R2 (prod) -> public URL.
 *   3. AWS Rekognition IndexFaces into the class's Collection,
 *      ExternalImageId = studentCode.
 *   4. Insert student row (awsFaceId + avatarUrl) into Supabase.
 */
export async function registerStudent(
  formData: FormData,
): Promise<ActionResult<Student>> {
  return withAction(async () => {
    // --- 1. Auth: must be a logged-in teacher ---
    const { supabase } = await requireTeacher();

    // --- 2. Validate fields ---
    const parsed = registerStudentSchema.safeParse({
      studentCode: formData.get("studentCode"),
      lastName: formData.get("lastName"),
      firstName: formData.get("firstName"),
      dateOfBirth: formData.get("dateOfBirth") || undefined,
      classId: formData.get("classId"),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }
    const input = parsed.data;

    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) {
      throw new Error("Thiếu ảnh chân dung học sinh");
    }
    const imageBytes = new Uint8Array(await image.arrayBuffer());

    // --- 3. Upload portrait to S3 (MinIO / R2) ---
    const objectKey = `students/${input.classId}/${input.studentCode}-${Date.now()}.jpg`;
    const s3 = createS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: objectKey,
        Body: imageBytes,
        ContentType: image.type || "image/jpeg",
      }),
    );
    const avatarUrl = getPublicUrl(objectKey);

    // --- 4. Index face into the class's Rekognition collection ---
    const rekognition = createRekognitionClient();
    const collectionId = getCollectionId(input.classId);
    try {
      await rekognition.send(
        new CreateCollectionCommand({ CollectionId: collectionId }),
      );
    } catch (err) {
      if (!(err instanceof ResourceAlreadyExistsException)) throw err;
    }

    const indexResult = await rekognition.send(
      new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: imageBytes },
        ExternalImageId: input.studentCode,
        MaxFaces: 1,
        QualityFilter: "AUTO",
      }),
    );
    const faceRecord = indexResult.FaceRecords?.[0];
    if (!faceRecord?.Face?.FaceId) {
      throw new Error("Không nhận diện được khuôn mặt trong ảnh");
    }

    // --- 5. Insert student into Supabase (RLS: teacher must own the class) ---
    const { data: student, error } = await supabase
      .from("students")
      .insert({
        studentCode: input.studentCode,
        lastName: input.lastName,
        firstName: input.firstName,
        dateOfBirth: input.dateOfBirth ?? null,
        classId: input.classId,
        awsFaceId: faceRecord.Face.FaceId,
        avatarUrl,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await initializeGradesForClassStudents(
      supabase,
      input.classId,
      [student.id as string],
    );
    return student as Student;
  });
}
