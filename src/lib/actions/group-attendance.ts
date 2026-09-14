"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { SearchFacesByImageCommand } from "@aws-sdk/client-rekognition";
import { createS3Client, getPublicUrl, S3_BUCKET } from "@lib/storage";
import { createRekognitionClient, getCollectionId } from "@lib/rekognition";
import type { GroupAttendanceSummary } from "@types";
import {
  ATTENDANCE_STATUS,
  FACE_MATCH_THRESHOLD,
  PHOTO_ATTENDANCE_ENABLED,
  REKOGNITION_IMAGE_MAX_BYTES,
} from "@constants";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/**
 * Server Action: Group Attendance.
 * Flow (per docs/1-project-requirements.md):
 *   1. Teacher uploads an array of group photos.
 *   2. Upload all photos to MinIO/R2 -> imageUrls.
 *   3. Create an attendanceSessions row.
 *   4. Promise.all: SearchFacesByImageCommand per photo on the class's
 *      Rekognition collection.
 *   5. Collect ExternalImageIds (= studentCode) into a Set to dedupe
 *      students appearing in multiple photos; keep the best confidence.
 *   6. Insert attendanceRecords: CO_MAT if studentCode in the Set,
 *      VANG otherwise.
 */
export async function groupAttendance(
  formData: FormData,
): Promise<ActionResult<GroupAttendanceSummary>> {
  return withAction(async () => {
    if (!PHOTO_ATTENDANCE_ENABLED) {
      throw new Error("Điểm danh bằng ảnh đang tạm tắt");
    }

    // --- 1. Auth ---
    const { supabase } = await requireTeacher();

    const classId = formData.get("classId");
    if (typeof classId !== "string" || classId.length === 0) {
      throw new Error("Thiếu classId");
    }
    const sessionDate =
      (formData.get("sessionDate") as string | null) ||
      new Date().toISOString().slice(0, 10);

    // `photos`: originals (best accuracy for Rekognition).
    // `photosCompressed`: smaller copies kept in S3 storage.
    const photos = formData
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (photos.length === 0) {
      throw new Error("Cần ít nhất 1 ảnh nhóm");
    }
    const compressed = formData
      .getAll("photosCompressed")
      .filter((f): f is File => f instanceof File && f.size > 0);
    const storagePhotos =
      compressed.length === photos.length ? compressed : photos;

    // --- 2. Upload all photos to S3 ---
    const s3 = createS3Client();
    const imageUrls = await Promise.all(
      storagePhotos.map(async (photo, i) => {
        const key = `attendance/${classId}/${sessionDate}/${Date.now()}-${i}.jpg`;
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: new Uint8Array(await photo.arrayBuffer()),
            ContentType: photo.type || "image/jpeg",
          }),
        );
        return getPublicUrl(key);
      }),
    );

    // --- 3. Create the attendance session ---
    const { data: session, error: sessionError } = await supabase
      .from("attendanceSessions")
      .insert({ classId, sessionDate, imageUrls })
      .select("id")
      .single();
    if (sessionError) throw new Error(sessionError.message);

    // --- 4. Search faces in every photo (parallel) ---
    const rekognition = createRekognitionClient();
    const collectionId = getCollectionId(classId);
    const searchResults = await Promise.all(
      photos.map(async (photo, i) => {
        // Fall back to the compressed copy when the original exceeds
        // the Rekognition Bytes payload limit.
        const source =
          photo.size <= REKOGNITION_IMAGE_MAX_BYTES
            ? photo
            : storagePhotos[i];
        const bytes = new Uint8Array(await source.arrayBuffer());
        const res = await rekognition.send(
          new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: { Bytes: bytes },
            MaxFaces: 50,
            FaceMatchThreshold: FACE_MATCH_THRESHOLD,
          }),
        );
        return res.FaceMatches ?? [];
      }),
    );

    // --- 5. Dedupe: studentCode -> best confidence ---
    const presentMap = new Map<string, number>();
    for (const matches of searchResults) {
      for (const match of matches) {
        const code = match.Face?.ExternalImageId;
        const confidence = match.Similarity ?? match.Face?.Confidence ?? 0;
        if (!code) continue;
        const prev = presentMap.get(code);
        if (prev === undefined || confidence > prev) {
          presentMap.set(code, confidence);
        }
      }
    }

    // --- 6. Build attendanceRecords for the whole class roster ---
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, studentCode")
      .eq("classId", classId);
    if (studentsError) throw new Error(studentsError.message);

    const records = (students ?? []).map((s) => ({
      sessionId: session.id,
      studentId: s.id as string,
      status: presentMap.has(s.studentCode as string)
        ? ATTENDANCE_STATUS.PRESENT
        : ATTENDANCE_STATUS.ABSENT,
      confidence: presentMap.get(s.studentCode as string) ?? null,
    }));

    if (records.length > 0) {
      const { error: recordsError } = await supabase
        .from("attendanceRecords")
        .insert(records);
      if (recordsError) throw new Error(recordsError.message);
    }

    return {
      sessionId: session.id as string,
      presentCount: records.filter(
        (r) => r.status === ATTENDANCE_STATUS.PRESENT,
      ).length,
      totalCount: records.length,
    } satisfies GroupAttendanceSummary;
  });
}
