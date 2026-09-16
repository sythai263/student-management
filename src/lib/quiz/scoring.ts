import { QUIZ_SCORE_BASE, QUIZ_SCORE_TIME_BONUS } from "@constants";
import type { LeaderboardEntry, QuizPlayerState } from "@types";

/** Kahoot-style score: 500 base + up to 500 time bonus for correct answers. */
export function computeAnswerScore(
  correct: boolean,
  remainingMs: number,
  timeLimitSec: number,
): number {
  if (!correct) return 0;
  return (
    QUIZ_SCORE_BASE +
    Math.round((QUIZ_SCORE_TIME_BONUS * Math.max(0, remainingMs)) / (timeLimitSec * 1000))
  );
}

/** Sorted scoreboard (desc) from the host's in-memory player map. */
export function buildLeaderboard(
  players: Map<string, QuizPlayerState>,
): LeaderboardEntry[] {
  return [...players.values()]
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      score: p.score,
      correctCount: p.correctCount,
    }))
    .sort((a, b) => b.score - a.score);
}

/** JWK equality — undefined-safe (keyless players on insecure contexts). */
export function isSamePublicKey(a?: JsonWebKey, b?: JsonWebKey): boolean {
  if (!a || !b) return !a && !b;
  return a.x === b.x && a.y === b.y && a.kty === b.kty;
}
