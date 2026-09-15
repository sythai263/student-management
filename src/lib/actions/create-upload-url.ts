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
 * - "*-display": compressed copy kept permanently as avatarKey/imageKeys.
 * - "signature-display": teacher's signature PNG, scoped by teacherId
 *   instead of classId (a signature is not tied to a single class).
 */
const KIND_PREFIX = {
  "student-original": "tmp/students",
  "student-display": "students",
  "attendance-original": "tmp/attendance",
  "attendance-display": "attendance",
  "signature-display": "signatures",
} as const;
type UploadKind = keyof typeof KIND_PREFIX;

/** Kinds scoped by teacherId (from the session) instead of classId. */
const TEACHER_SCOPED_KINDS: readonly UploadKind[] = ["signature-display"];

/** classId/label are trusted app values but still sanitized before
 * being embedded in a storage key. */
function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "x";
}

/** File extension inferred from the declared content type. */
function extensionForContentType(contentType: string): string {
  return contentType === "image/png" ? "png" : "jpg";
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
    const { user } = await requireTeacher();

    const kind = formData.get("kind");
    if (typeof kind !== "string" || !(kind in KIND_PREFIX)) {
      throw new Error("Yêu cầu tải tệp lên không hợp lệ");
    }

    const scopeSegment = TEACHER_SCOPED_KINDS.includes(kind as UploadKind)
      ? user.id
      : formData.get("classId");
    if (typeof scopeSegment !== "string" || scopeSegment.length === 0) {
      throw new Error("Thiếu thông tin lớp học");
    }

    const label = formData.get("label");
    const contentType =
      (formData.get("contentType") as string | null) || "image/jpeg";

    const prefix = KIND_PREFIX[kind as UploadKind];
    const segment =
      typeof label === "string" && label.length > 0
        ? sanitizeSegment(label)
        : "file";
    const ext = extensionForContentType(contentType);
    const key = `${prefix}/${sanitizeSegment(scopeSegment)}/${segment}-${Date.now()}-${randomUUID()}.${ext}`;

    const url = await createPresignedUploadUrl(key, contentType);
    return { key, url };
  });
}
