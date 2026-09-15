import { createUploadUrl } from "@lib/actions";

/**
 * Client-side image compression via Canvas API.
 * Resizes to max dimension and re-encodes as JPEG before upload.
 */
export async function compressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.8,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh này");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh"))),
      "image/jpeg",
      quality,
    ),
  );

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

/**
 * Uploads a file straight to storage (MinIO/R2) via a presigned URL
 * minted by `createUploadUrl`, bypassing Server Action body limits.
 * Returns the storage key to pass along to the actual action.
 */
export async function uploadDirect(
  kind: "student-original" | "student-display" | "attendance-original" | "attendance-display",
  classId: string,
  label: string,
  file: File,
): Promise<string> {
  const fd = new FormData();
  fd.set("kind", kind);
  fd.set("classId", classId);
  fd.set("label", label);
  fd.set("contentType", file.type || "image/jpeg");

  const result = await createUploadUrl(fd);
  if (!result.success) throw new Error(result.error);

  const res = await fetch(result.data.url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "image/jpeg" },
  });
  if (!res.ok) throw new Error("Tải ảnh lên thất bại, vui lòng thử lại");

  return result.data.key;
}

/**
 * Uploads a teacher signature PNG straight to storage, unmodified —
 * unlike `uploadDirect`, it is never re-encoded to JPEG so the
 * transparent background is preserved. Scoped by teacherId, not
 * classId (a signature is not tied to a single class).
 */
export async function uploadSignatureDirect(file: File): Promise<string> {
  if (file.type !== "image/png") {
    throw new Error("Chữ ký phải là ảnh PNG (nền trong suốt)");
  }
  const MAX_BYTES = 2 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error("Ảnh chữ ký không được vượt quá 2MB");
  }

  const fd = new FormData();
  fd.set("kind", "signature-display");
  fd.set("label", "signature");
  fd.set("contentType", file.type);

  const result = await createUploadUrl(fd);
  if (!result.success) throw new Error(result.error);

  const res = await fetch(result.data.url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("Tải chữ ký lên thất bại, vui lòng thử lại");

  return result.data.key;
}
