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
