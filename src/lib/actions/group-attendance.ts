"use server";

import {
  DetectFacesCommand,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import sharp from "sharp";
import { deleteObject, downloadObject } from "@lib/storage";
import { defaultSessionName } from "@lib/attendance-session";
import { createRekognitionClient, getCollectionId } from "@lib/rekognition";
import type { GroupAttendanceSummary } from "@types";
import {
  ATTENDANCE_STATUS,
  FACE_MATCH_THRESHOLD,
  FEATURE_FLAGS,
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
 *   1. Teacher's browser uploads original + compressed copies of each
 *      group photo directly to storage (see `uploadDirect`) — only the
 *      resulting keys are sent here, never the files themselves
 *      (Vercel Functions cap request bodies at 4.5MB).
 *   2. `displayKeys` already sit at their final storage location -> imageKeys.
 *   3. Create an attendanceSessions row.
 *   4. Per original: download bytes -> DetectFaces -> crop each face ->
 *      SearchFacesByImage per crop (the API only matches the largest
 *      face, so crops are required) -> delete the temp original.
 *   5. Collect ExternalImageIds (= studentCode) into a Map to dedupe
 *      students appearing in multiple photos; keep the best confidence.
 *   6. Insert attendanceRecords: CO_MAT if studentCode in the Set,
 *      VANG otherwise.
 */
export async function groupAttendance(
  formData: FormData,
): Promise<ActionResult<GroupAttendanceSummary>> {
  return withAction(async () => {
    if (!FEATURE_FLAGS.PHOTO_ATTENDANCE) {
      throw new Error("Điểm danh bằng ảnh đang tạm tắt");
    }

    // --- 1. Auth ---
    const { supabase } = await requireTeacher();

    const classId = formData.get("classId");
    if (typeof classId !== "string" || classId.length === 0) {
      throw new Error("Thiếu thông tin lớp học");
    }
    const sessionDate =
      (formData.get("sessionDate") as string | null) ||
      new Date().toISOString().slice(0, 10);

    // `photoKeys`: temp originals (best accuracy for Rekognition), deleted
    // after use. `photoDisplayKeys`: compressed copies already uploaded
    // to their final, permanent storage location.
    const photoKeys = formData
      .getAll("photoKeys")
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (photoKeys.length === 0) {
      throw new Error("Cần ít nhất 1 ảnh nhóm");
    }
    const displayKeys = formData
      .getAll("photoDisplayKeys")
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    // Keys are stored, not URLs — the bucket has no public access, the
    // browser reads them back through the authenticated /api/image route.
    const imageKeys =
      displayKeys.length === photoKeys.length ? displayKeys : photoKeys;

    // --- 3. Create the attendance session ---
    const { data: session, error: sessionError } = await supabase
      .from("attendanceSessions")
      .insert({
        classId,
        sessionDate,
        name: defaultSessionName(sessionDate),
        imageKeys,
      })
      .select("id")
      .single();
    if (sessionError) throw new Error(sessionError.message);

    // --- 4. Search faces in every photo ---
    // SearchFacesByImage only matches the LARGEST face in an image, so the
    // group-photo flow is: DetectFaces -> crop each face (padded) ->
    // SearchFacesByImage per crop.
    const rekognition = createRekognitionClient();
    const collectionId = getCollectionId(classId);
    const presentMap = new Map<string, number>();

    await Promise.all(
      photoKeys.map(async (photoKey, i) => {
        // Rekognition's Bytes payload caps at 5MB — camera originals
        // can be much larger, so fall back to the compressed display copy.
        let bytes = await downloadObject(photoKey);
        if (bytes.byteLength > REKOGNITION_IMAGE_MAX_BYTES && displayKeys[i]) {
          bytes = await downloadObject(displayKeys[i]);
        }

        const detect = await rekognition.send(
          new DetectFacesCommand({ Image: { Bytes: bytes } }),
        );

        // .rotate() normalizes EXIF orientation — Rekognition reports
        // bounding boxes in the orientation-corrected frame.
        const img = sharp(bytes).rotate();
        const { width = 0, height = 0 } = await img.metadata();

        const PAD = 0.3;
        const crops = await Promise.all(
          (detect.FaceDetails ?? []).map(async (face) => {
            const bb = face.BoundingBox;
            if (!bb?.Width || !bb.Height || bb.Left == null || bb.Top == null) {
              return null;
            }
            const left = Math.max(0, Math.floor((bb.Left - bb.Width * PAD) * width));
            const top = Math.max(0, Math.floor((bb.Top - bb.Height * PAD) * height));
            const w = Math.min(
              width - left,
              Math.ceil(bb.Width * (1 + PAD * 2) * width),
            );
            const h = Math.min(
              height - top,
              Math.ceil(bb.Height * (1 + PAD * 2) * height),
            );
            if (w < 20 || h < 20) return null;
            return img
              .clone()
              .extract({ left, top, width: w, height: h })
              .jpeg({ quality: 92 })
              .toBuffer();
          }),
        );

        const results = await Promise.all(
          crops
            .filter((c) => c !== null)
            .map((crop) =>
              rekognition
                .send(
                  new SearchFacesByImageCommand({
                    CollectionId: collectionId,
                    Image: { Bytes: crop },
                    MaxFaces: 1,
                    FaceMatchThreshold: FACE_MATCH_THRESHOLD,
                  }),
                )
                .then((r) => r.FaceMatches ?? [])
                .catch(() => []),
            ),
        );

        // Dedupe: studentCode -> best similarity across all crops/photos.
        for (const matches of results) {
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

        // Temp original no longer needed once processed.
        await deleteObject(photoKey);
      }),
    );

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
