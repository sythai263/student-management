import { QUIZ_SCORE_MAX, QUIZ_SCORE_MIN } from "@constants";
import type { LeaderboardEntry, QuizPlayerState } from "@types";

/** Đúng = 1000đ giảm tuyến tính theo thời gian còn lại, sàn 250đ (1/4). */
export function computeAnswerScore(
  correct: boolean,
  remainingMs: number,
  timeLimitSec: number,
): number {
  if (!correct) return 0;
  const ratio = Math.max(0, remainingMs) / (timeLimitSec * 1000);
  return QUIZ_SCORE_MIN + Math.round((QUIZ_SCORE_MAX - QUIZ_SCORE_MIN) * ratio);
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
