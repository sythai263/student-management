import { QUIZ_PLAYER_STORAGE_PREFIX } from "@constants";
import type { PlayerIdentity } from "@types";

/**
 * Player identity persisted in sessionStorage so a dropped connection
 * or page refresh rejoins as the same playerId (+ same signing key).
 */

function storageKey(sessionId: string): string {
  return `${QUIZ_PLAYER_STORAGE_PREFIX}${sessionId}`;
}

export function getPlayerIdentity(sessionId: string): PlayerIdentity | null {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerIdentity;
    if (!parsed.playerId || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayerIdentity(
  sessionId: string,
  identity: PlayerIdentity,
): void {
  sessionStorage.setItem(storageKey(sessionId), JSON.stringify(identity));
}

/** Re-key the identity after a `reject` (playerId already bound). */
export function regeneratePlayerIdentity(sessionId: string): PlayerIdentity | null {
  const current = getPlayerIdentity(sessionId);
  if (!current) return null;
  const next: PlayerIdentity = {
    playerId: crypto.randomUUID(),
    name: current.name,
  };
  savePlayerIdentity(sessionId, next);
  return next;
}
