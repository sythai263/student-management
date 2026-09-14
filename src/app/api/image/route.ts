import { downloadObject } from "@lib/storage";
import { createSupabaseServerClient } from "@lib/supabase";

// Only permanent display prefixes are servable — tmp/ originals are
// Rekognition-only and deleted right after indexing.
const ALLOWED_PREFIXES = ["students/", "attendance/"];

/**
 * Authenticated image proxy: the bucket has no public access, so the
 * browser fetches stored objects through this route. Auth = the same
 * teacher session cookie used by Server Actions.
 */
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const bytes = await downloadObject(key);
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "image/jpeg",
        // Private to this browser session — never CDN/shared caches.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
