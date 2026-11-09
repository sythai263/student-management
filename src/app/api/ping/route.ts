import { pingKeepAlive } from "@lib/data-keep-alive";

// Never cache — every hit must actually bump the heartbeat row.
export const dynamic = "force-dynamic";

/**
 * Keep-alive endpoint for cron-job.org: bumps the keepAlive row so the
 * free-tier Supabase project never idles into a pause. Public by design
 * (see PUBLIC_PATHS) — the worst an attacker can do is ping it more.
 */
export async function GET() {
  try {
    const lastPingedAt = await pingKeepAlive();
    return Response.json(
      { success: true, lastPingedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { success: false, error: "Ping thất bại" },
      { status: 500 },
    );
  }
}
