import { S3Client } from "@aws-sdk/client-s3";

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
