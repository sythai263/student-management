import type { RealtimeChannel } from "@supabase/supabase-js";
import { QUIZ_CHANNEL_PREFIX } from "@constants";
import { signPayload } from "./crypto";
import type { createSupabaseBrowserClient } from "@lib/supabase/client";

type BrowserSupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;

/** One realtime room per quiz session: `quiz-room-{sessionId}`. */
export function createRoomChannel(
  supabase: BrowserSupabaseClient,
  sessionId: string,
  presenceKey: string,
): RealtimeChannel {
  return supabase.channel(`${QUIZ_CHANNEL_PREFIX}${sessionId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: presenceKey },
    },
  });
}

/** Broadcast an event, signing the payload when a private key exists. */
export async function sendSignedEvent(
  channel: RealtimeChannel | null,
  privateKey: CryptoKey | null,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = { ...payload };
  if (privateKey) body.sig = await signPayload(privateKey, body);
  await channel?.send({ type: "broadcast", event, payload: body });
}

/** Strict channel teardown — call from every useEffect cleanup. */
export function removeRoomChannel(
  supabase: BrowserSupabaseClient | null,
  channel: RealtimeChannel | null,
): void {
  if (channel) void supabase?.removeChannel(channel);
}
