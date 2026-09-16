/** Realtime channel name prefix — one room per quiz session. */
export const QUIZ_CHANNEL_PREFIX = "quiz-room-";

/** Broadcast event names for the quiz room protocol. */
export const QUIZ_EVENTS = {
  HOST_HELLO: "host-hello",
  PLAYER_HELLO: "player-hello",
  REJECT: "reject",
  QUESTION: "question",
  ANSWER: "answer",
  REVEAL: "reveal",
  END: "end",
} as const;

/** Presence key used by the teacher's host client. */
export const QUIZ_HOST_PRESENCE_KEY = "host";

/** sessionStorage key prefix holding a player's identity + keypair. */
export const QUIZ_PLAYER_STORAGE_PREFIX = "quiz-player-";

/** Fallback when NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES is unset/invalid. */
export const QUIZ_DEFAULT_TIMEOUT_MINUTES = 60;

/** Kahoot-style scoring: 500 base + up to 500 time bonus. */
export const QUIZ_SCORE_BASE = 500;
export const QUIZ_SCORE_TIME_BONUS = 500;

/** Grace period (ms) after question end during which answers still count. */
export const QUIZ_ANSWER_GRACE_MS = 2000;

/** Server-side backstop: RPCs reject sessions older than this. */
export const QUIZ_SESSION_MAX_AGE_HOURS = 24;

/** Room auto-close deadline — NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES (min 60). */
export const QUIZ_ROOM_TIMEOUT_MS =
  (Number(process.env.NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES) ||
    QUIZ_DEFAULT_TIMEOUT_MINUTES) *
  60 *
  1000;

/** Room PIN length (digits). */
export const QUIZ_PIN_LENGTH = 6;

/** Answer-option labels shown in the quiz editor (A–F). */
export const QUIZ_OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

/** Selectable per-question time limits (seconds) in the editor. */
export const QUIZ_TIME_LIMITS = [10, 15, 20, 30, 45, 60, 90, 120] as const;

/** Kahoot-style option colors for the player screen. */
export const QUIZ_OPTION_STYLES = [
  "bg-red-600 hover:bg-red-500",
  "bg-blue-600 hover:bg-blue-500",
  "bg-amber-500 hover:bg-amber-400",
  "bg-green-600 hover:bg-green-500",
  "bg-purple-600 hover:bg-purple-500",
  "bg-pink-600 hover:bg-pink-500",
] as const;
