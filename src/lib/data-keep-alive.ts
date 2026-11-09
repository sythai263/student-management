import { createSupabaseAdminClient } from "@lib/supabase";
import { KEEP_ALIVE_KEY } from "@constants";

/**
 * Bump the heartbeat row — called by /api/ping (cron) and the /ping
 * status page, both unauthenticated, so writes go through the
 * service-role client (no write policies exist on keepAlive).
 * Upsert self-heals a missing row.
 */
export async function pingKeepAlive(): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const lastPingedAt = new Date().toISOString();
  const { error } = await supabase
    .from("keepAlive")
    .upsert({ key: KEEP_ALIVE_KEY, lastPingedAt });
  if (error) throw new Error(error.message);
  return lastPingedAt;
}
