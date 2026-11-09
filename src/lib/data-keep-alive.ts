import { createSupabaseAdminClient, createSupabaseServerClient } from "@lib/supabase";
import { KEEP_ALIVE_KEY } from "@constants";

/**
 * Bump the heartbeat row — called by the unauthenticated /api/ping cron
 * endpoint, so writes go through the service-role client (no write
 * policies exist on keepAlive). Upsert self-heals a missing row.
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

/** Read the last heartbeat for the public /ping status page. */
export async function getLastKeepAlivePing(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("keepAlive")
    .select("lastPingedAt")
    .eq("key", KEEP_ALIVE_KEY)
    .maybeSingle();
  return data?.lastPingedAt ?? null;
}
