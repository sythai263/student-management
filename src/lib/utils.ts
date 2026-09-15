export { cn } from "cn"

const FALLBACK_ERROR_MESSAGE = "Có lỗi xảy ra, vui lòng thử lại.";

const VIETNAMESE_CHAR =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

/**
 * Convert any thrown error into a message a non-technical user can read.
 * Hand-written messages are already Vietnamese (they contain diacritics)
 * and pass through unchanged; raw English errors from the database or
 * network become a generic fallback instead of leaking jargon to the UI.
 */
export function friendlyErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return raw && VIETNAMESE_CHAR.test(raw) ? raw : FALLBACK_ERROR_MESSAGE;
}
