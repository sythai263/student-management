"use server";

import { randomUUID } from "node:crypto";
import { createPresignedUploadUrl } from "@lib/storage";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

export interface UploadUrl {
  key: string;
  url: string;
}

/**
 * Storage prefix per upload kind.
 * - "*-original": full-quality file kept only long enough for
 *   Rekognition to read it, then deleted (see rekognition/faces.ts).
 * - "*-display": compressed copy kept permanently as avatarUrl/imageUrls.
 */
const KIND_PREFIX = {
  "student-original": "tmp/students",
  "student-display": "students",
  "attendance-original": "tmp/attendance",
  "attendance-display": "attendance",
} as const;
type UploadKind = keyof typeof KIND_PREFIX;

/** classId/label are trusted app values but still sanitized before
 * being embedded in a storage key. */
function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "x";
}

/**
 * Server Action: mint a presigned PUT URL so the browser uploads the
 * file straight to MinIO/R2. Files must never flow through a Server
 * Action body — Vercel Functions cap request bodies at 4.5MB.
 */
export async function createUploadUrl(
  formData: FormData,
): Promise<ActionResult<UploadUrl>> {
  return withAction(async () => {
    await requireTeacher();

    const kind = formData.get("kind");
    if (typeof kind !== "string" || !(kind in KIND_PREFIX)) {
      throw new Error("Loại upload không hợp lệ");
    }
    const classId = formData.get("classId");
    if (typeof classId !== "string" || classId.length === 0) {
      throw new Error("Thiếu classId");
    }
    const label = formData.get("label");
    const contentType =
      (formData.get("contentType") as string | null) || "image/jpeg";

    const prefix = KIND_PREFIX[kind as UploadKind];
    const segment =
      typeof label === "string" && label.length > 0
        ? sanitizeSegment(label)
        : "file";
    const key = `${prefix}/${sanitizeSegment(classId)}/${segment}-${Date.now()}-${randomUUID()}.jpg`;

    const url = await createPresignedUploadUrl(key, contentType);
    return { key, url };
  });
}
