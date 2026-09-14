import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible client.
 * - Development: MinIO at S3_ENDPOINT (default http://localhost:9000),
 *   forcePathStyle required.
 * - Production: Cloudflare R2 (S3_ENDPOINT = https://<account>.r2.cloudflarestorage.com).
 * Routed entirely by environment variables — same code for both.
 */
export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "auto",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

/** Build the public URL for a stored object key. */
export function getPublicUrl(objectKey: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "");
  return `${base}/${objectKey}`;
}

export const S3_BUCKET = process.env.S3_BUCKET ?? "student-management";

/**
 * Presigned PUT URL so the browser can upload a file directly to
 * MinIO/R2, bypassing the Server Action body-size limit entirely
 * (Vercel Functions cap request bodies at 4.5MB — file uploads must
 * never flow through them).
 */
export async function createPresignedUploadUrl(
  objectKey: string,
  contentType: string,
): Promise<string> {
  const s3 = createS3Client();
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  );
}

/** Download an object's bytes (e.g. a client-uploaded original for Rekognition). */
export async function downloadObject(objectKey: string): Promise<Uint8Array> {
  const s3 = createS3Client();
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
  );
  if (!Body) throw new Error(`Không tải được object: ${objectKey}`);
  return Body.transformToByteArray();
}

/** Delete an object (best-effort cleanup of temp originals). */
export async function deleteObject(objectKey: string): Promise<void> {
  try {
    const s3 = createS3Client();
    await s3.send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
    );
  } catch {
    // Non-fatal — a leftover temp object costs a few KB of storage.
  }
}
