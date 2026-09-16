export type QuizSessionStatus = "waiting" | "playing" | "finished";

export interface Quiz {
  id: string;
  teacherId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  orderIndex: number;
  text: string;
  options: string[];
  correctIndex: number;
  /** Seconds */
  timeLimit: number;
}

export interface QuizSession {
  id: string;
  quizId: string;
  pinCode: string;
  status: QuizSessionStatus;
  hostPublicKey: JsonWebKey | null;
  currentQuestionIndex: number;
  questionEndsAt: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface QuizSessionResult {
  id: string;
  sessionId: string;
  playerId: string;
  playerName: string;
  totalScore: number;
  correctCount: number;
  createdAt: string;
}

/** Question shape exposed to players — never contains correctIndex. */
export type PublicQuestion = {
  index: number;
  text: string;
  options: string[];
  timeLimit: number;
  endsAt: string | null;
};

/** Safe session info returned by join_quiz_session / get_quiz_session_state. */
export interface QuizSessionInfo {
  sessionId: string;
  status: QuizSessionStatus;
  quizTitle: string;
  questionCount: number;
  hostPublicKey: JsonWebKey | null;
  currentQuestionIndex: number;
  question?: PublicQuestion | null;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  score: number;
  correctCount: number;
}

// ------------------------------------------------------------------
// Broadcast payloads. Every payload may carry `sig` — an ECDSA
// signature over the canonical JSON of the remaining fields.
// ------------------------------------------------------------------

// NOTE: these are `type` aliases (not interfaces) so they stay
// assignable to Record<string, unknown> for the signing helpers.

export type HostHelloPayload = {
  sessionId: string;
  sig?: string;
};

export type PlayerHelloPayload = {
  playerId: string;
  name: string;
  /** Absent on non-secure contexts (no crypto.subtle) — host binds
   *  playerId without signature verification in that mode. */
  publicKey?: JsonWebKey;
  /** Random id so a reject only applies to the sender of this hello. */
  attemptId: string;
  sig?: string;
};

export type RejectPayload = {
  playerId: string;
  attemptId: string;
  reason: string;
  sig?: string;
};

export type QuestionPayload = PublicQuestion & {
  totalQuestions: number;
  sig?: string;
};

export type AnswerPayload = {
  playerId: string;
  questionIndex: number;
  choiceIndex: number;
  sig?: string;
};

export type RevealPayload = {
  index: number;
  correctIndex: number;
  /** How many players picked each option index. */
  counts: number[];
  leaderboard: LeaderboardEntry[];
  sig?: string;
};

export type EndPayload = {
  leaderboard: LeaderboardEntry[];
  sig?: string;
};
