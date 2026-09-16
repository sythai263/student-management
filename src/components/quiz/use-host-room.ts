"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import {
  advanceQuizQuestion,
  finishQuizSession,
  getHostSessionData,
  setSessionHostKey,
} from "@lib/actions";
import {
  buildLeaderboard,
  computeAnswerScore,
  createRoomChannel,
  generateSigningKeys,
  importPublicKey,
  isSamePublicKey,
  isSigningSupported,
  removeRoomChannel,
  sendSignedEvent,
  verifyPayload,
  type SigningKeys,
} from "@lib/quiz";
import {
  QUIZ_ANSWER_GRACE_MS,
  QUIZ_EVENTS,
  QUIZ_HOST_PRESENCE_KEY,
  QUIZ_ROOM_TIMEOUT_MS,
} from "@constants";
import type {
  AnswerPayload,
  HostHelloPayload,
  HostPhase,
  HostRevealState,
  HostSessionData,
  LeaderboardEntry,
  PlayerHelloPayload,
  PodiumPayload,
  QuizPlayerState,
  QuizQuestion,
  RejectPayload,
} from "@types";

export interface HostRoomState {
  phase: HostPhase;
  error: string | null;
  data: HostSessionData | null;
  players: QuizPlayerState[];
  currentIndex: number;
  currentQuestion: QuizQuestion | null;
  secondsLeft: number;
  answeredCount: number;
  reveal: HostRevealState | null;
  leaderboard: LeaderboardEntry[];
  /** Podium ceremony progress: 0 = nothing, 1..3 = ranks 3..1 revealed. */
  podiumStep: number;
  roomSecondsLeft: number;
  totalQuestions: number;
}

export interface HostRoomActions {
  showQuestion: (index: number) => Promise<void>;
  revealAnswer: () => Promise<void>;
  /** Enter the podium ceremony after the last question's reveal. */
  enterPodium: () => void;
  /** Reveal the next podium rank (3 -> 2 -> 1) and broadcast it. */
  revealNextRank: () => Promise<void>;
  finish: (broadcastEnd: boolean) => Promise<void>;
}

/**
 * Host-side game engine: loads the session, opens the realtime room,
 * binds verified players, scores answers, and enforces the auto-close
 * deadline (NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES).
 */
export function useHostRoom(sessionId: string): HostRoomState & HostRoomActions {
  const [phase, setPhase] = useState<HostPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HostSessionData | null>(null);
  const [players, setPlayers] = useState<QuizPlayerState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [revealState, setRevealState] = useState<HostRevealState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [podiumStep, setPodiumStep] = useState(0);
  const [roomSecondsLeft, setRoomSecondsLeft] = useState(
    Math.floor(QUIZ_ROOM_TIMEOUT_MS / 1000),
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);
  const hostKeysRef = useRef<SigningKeys | null>(null);
  const pendingFinishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playersRef = useRef(new Map<string, QuizPlayerState>());
  const answeredRef = useRef(new Set<string>());
  const countsRef = useRef<number[]>([]);
  const endsAtRef = useRef(0);
  const phaseRef = useRef<HostPhase>("loading");
  const finishedRef = useRef(false);
  const roomDeadlineRef = useRef(0);
  const indexRef = useRef(-1);
  const podiumStepRef = useRef(0);
  const questionsRef = useRef<QuizQuestion[]>([]);
  const dataRef = useRef<HostSessionData | null>(null);

  const questions = data?.questions ?? [];
  const currentQuestion =
    currentIndex >= 0 ? (questions[currentIndex] ?? null) : null;

  const sendSigned = useCallback(
    (event: string, payload: Record<string, unknown>) =>
      sendSignedEvent(
        channelRef.current,
        hostKeysRef.current?.privateKey ?? null,
        event,
        payload,
      ),
    [],
  );

  const rejectPlayer = useCallback(
    async (playerId: string, attemptId: string, reason: string) => {
      const payload: RejectPayload = { playerId, attemptId, reason };
      await sendSigned(QUIZ_EVENTS.REJECT, payload);
    },
    [sendSigned],
  );

  // ----------------------------------------------------------------
  // Incoming player messages
  // ----------------------------------------------------------------
  const onPlayerHello = useCallback(
    async (payload: PlayerHelloPayload) => {
      if (finishedRef.current) return;
      const existing = playersRef.current.get(payload.playerId);
      if (existing) {
        // Rejoin: same key is fine (name refresh). A different key trying
        // to claim an already-bound playerId is rejected — the offender's
        // own attemptId keeps the legit player unaffected.
        if (isSamePublicKey(existing.publicKeyJwk, payload.publicKey)) {
          existing.name = payload.name;
          setPlayers([...playersRef.current.values()]);
        } else {
          await rejectPlayer(
            payload.playerId,
            payload.attemptId,
            "ID đã được sử dụng",
          );
        }
        return;
      }
      let publicKey: CryptoKey | null = null;
      // Keyless hello (student on a non-secure context): bound without a
      // key — their answers can't be verified, but keyed players stay
      // spoof-proof. Rejecting here would break LAN play where the host
      // is on localhost and students on http://<lan-ip>.
      if (isSigningSupported() && payload.publicKey) {
        try {
          publicKey = await importPublicKey(payload.publicKey);
          if (!(await verifyPayload(publicKey, payload))) {
            await rejectPlayer(
              payload.playerId,
              payload.attemptId,
              "Chữ ký không hợp lệ",
            );
            return;
          }
        } catch {
          await rejectPlayer(
            payload.playerId,
            payload.attemptId,
            "Không xác thực được",
          );
          return;
        }
      }
      playersRef.current.set(payload.playerId, {
        playerId: payload.playerId,
        name: payload.name,
        publicKey,
        publicKeyJwk: payload.publicKey,
        score: 0,
        correctCount: 0,
      });
      setPlayers([...playersRef.current.values()]);
    },
    [rejectPlayer],
  );

  const onAnswer = useCallback(async (payload: AnswerPayload) => {
    if (phaseRef.current !== "question") return;
    if (payload.questionIndex !== indexRef.current) return;
    if (Date.now() > endsAtRef.current + QUIZ_ANSWER_GRACE_MS) return;
    if (answeredRef.current.has(payload.playerId)) return;

    const player = playersRef.current.get(payload.playerId);
    if (!player) return;
    if (isSigningSupported() && player.publicKey) {
      if (!(await verifyPayload(player.publicKey, payload))) return;
    }

    answeredRef.current.add(payload.playerId);
    const q = questionsRef.current[indexRef.current];
    if (!q) return;
    if (payload.choiceIndex < 0 || payload.choiceIndex >= q.options.length)
      return;
    countsRef.current[payload.choiceIndex] =
      (countsRef.current[payload.choiceIndex] ?? 0) + 1;

    const gained = computeAnswerScore(
      payload.choiceIndex === q.correctIndex,
      endsAtRef.current - Date.now(),
      q.timeLimit,
    );
    player.score += gained;
    if (gained > 0) player.correctCount += 1;
    setAnsweredCount(answeredRef.current.size);
  }, []);

  // ----------------------------------------------------------------
  // Game flow
  // ----------------------------------------------------------------
  const showQuestion = useCallback(
    async (index: number) => {
      const q = questionsRef.current[index];
      if (!q || !dataRef.current) return;
      const endsAt = new Date(Date.now() + q.timeLimit * 1000).toISOString();
      await advanceQuizQuestion(sessionId, index, endsAt);
      endsAtRef.current = Date.now() + q.timeLimit * 1000;
      answeredRef.current = new Set();
      countsRef.current = new Array(q.options.length).fill(0);
      setCurrentIndex(index);
      setAnsweredCount(0);
      setRevealState(null);
      setPhase("question");
      await sendSigned(QUIZ_EVENTS.QUESTION, {
        index: q.orderIndex,
        text: q.text,
        options: q.options,
        timeLimit: q.timeLimit,
        endsAt,
        totalQuestions: questionsRef.current.length,
      });
    },
    [sendSigned, sessionId],
  );

  const revealAnswer = useCallback(async () => {
    if (phaseRef.current !== "question") return;
    const q = questionsRef.current[indexRef.current];
    if (!q) return;
    const board = buildLeaderboard(playersRef.current);
    setRevealState({ correctIndex: q.correctIndex, counts: countsRef.current });
    setLeaderboard(board);
    setPhase("reveal");
    await sendSigned(QUIZ_EVENTS.REVEAL, {
      index: q.orderIndex,
      correctIndex: q.correctIndex,
      counts: countsRef.current,
      leaderboard: board.slice(0, 10),
    });
  }, [sendSigned]);

  /** After the last question: switch to the podium ceremony view. */
  const enterPodium = useCallback(() => {
    if (phaseRef.current !== "reveal") return;
    podiumStepRef.current = 0;
    setPodiumStep(0);
    setPhase("podium");
  }, []);

  /** Teacher-driven reveal: hạng 3 -> hạng 2 -> hạng 1. Broadcast each
   *  step so student screens announce the rank too. */
  const revealNextRank = useCallback(async () => {
    if (phaseRef.current !== "podium") return;
    const step = podiumStepRef.current;
    if (step >= 3) return;
    const rank = 3 - step;
    const entry = buildLeaderboard(playersRef.current)[rank - 1];
    podiumStepRef.current = step + 1;
    setPodiumStep(step + 1);
    if (entry) {
      const payload: PodiumPayload = { rank, entry };
      await sendSigned(QUIZ_EVENTS.PODIUM, payload);
    }
  }, [sendSigned]);

  const finish = useCallback(
    async (broadcastEnd: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const board = buildLeaderboard(playersRef.current);
      setLeaderboard(board);
      setPhase("ended");
      if (broadcastEnd) {
        await sendSigned(QUIZ_EVENTS.END, { leaderboard: board });
      }
      const result = await finishQuizSession({
        sessionId,
        results: board.map((e) => ({
          playerId: e.playerId,
          playerName: e.name,
          totalScore: e.score,
          correctCount: e.correctCount,
        })),
      });
      if (!result.success) toast.error(result.error);
      const ch = channelRef.current;
      channelRef.current = null;
      removeRoomChannel(clientRef.current, ch);
    },
    [sendSigned, sessionId],
  );

  const finishRef = useRef(finish);
  const revealRef = useRef(revealAnswer);

  // Mirror latest state into refs for broadcast callbacks and timers
  // (passive effect — ref writes are not allowed during render).
  useEffect(() => {
    phaseRef.current = phase;
    indexRef.current = currentIndex;
    questionsRef.current = questions;
    dataRef.current = data;
    finishRef.current = finish;
    revealRef.current = revealAnswer;
  });

  // ----------------------------------------------------------------
  // Lifecycle: load session, generate host key, open channel, run the
  // auto-close countdown.
  // ----------------------------------------------------------------
  useEffect(() => {
    // Cancel a pending auto-finish: under React StrictMode the first
    // mount's cleanup schedules one, and this remount must cancel it.
    if (pendingFinishRef.current) {
      clearTimeout(pendingFinishRef.current);
      pendingFinishRef.current = null;
    }
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    clientRef.current = supabase;

    async function init() {
      const res = await getHostSessionData(sessionId);
      if (cancelled) return;
      if (!res.success) {
        setError(res.error);
        setPhase("error");
        return;
      }
      if (res.data.session.status === "finished") {
        setError("Phòng này đã kết thúc.");
        setPhase("error");
        return;
      }
      setData(res.data);

      if (isSigningSupported()) {
        const keys = await generateSigningKeys();
        hostKeysRef.current = keys;
        await setSessionHostKey(sessionId, keys.publicKeyJwk);
      } else {
        console.warn(
          "[quiz] crypto.subtle unavailable (non-secure context) — broadcast signatures disabled",
        );
      }

      const channel = createRoomChannel(
        supabase,
        sessionId,
        QUIZ_HOST_PRESENCE_KEY,
      );
      channelRef.current = channel;

      channel
        .on("broadcast", { event: QUIZ_EVENTS.PLAYER_HELLO }, ({ payload }) =>
          void onPlayerHello(payload as PlayerHelloPayload),
        )
        .on("broadcast", { event: QUIZ_EVENTS.ANSWER }, ({ payload }) =>
          void onAnswer(payload as AnswerPayload),
        )
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel.track({ role: "host" });
          const hello: HostHelloPayload = { sessionId };
          await sendSigned(QUIZ_EVENTS.HOST_HELLO, hello);
          if (!cancelled) setPhase("lobby");
        });

      roomDeadlineRef.current = Date.now() + QUIZ_ROOM_TIMEOUT_MS;
    }

    void init();

    const timer = setInterval(() => {
      // Deadline is only set after init() — skip ticks before that.
      if (!roomDeadlineRef.current) return;
      const roomLeft = Math.max(
        0,
        Math.ceil((roomDeadlineRef.current - Date.now()) / 1000),
      );
      setRoomSecondsLeft(roomLeft);
      if (roomLeft <= 0) {
        void finishRef.current(true);
        return;
      }
      if (phaseRef.current === "question") {
        const left = Math.max(
          0,
          Math.ceil((endsAtRef.current - Date.now()) / 1000),
        );
        setSecondsLeft(left);
        if (left <= 0) void revealRef.current();
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(timer);
      const ch = channelRef.current;
      channelRef.current = null;
      removeRoomChannel(supabase, ch);
      // If the host leaves while the room is still live, close the
      // session so students aren't stuck. Deferred 300ms so a StrictMode
      // remount (dev) can cancel it instead of killing the room.
      if (!finishedRef.current) {
        pendingFinishRef.current = setTimeout(
          () => void finishRef.current(false),
          300,
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    phase,
    error,
    data,
    players,
    currentIndex,
    currentQuestion,
    secondsLeft,
    answeredCount,
    reveal: revealState,
    leaderboard,
    podiumStep,
    roomSecondsLeft,
    totalQuestions: questions.length,
    showQuestion,
    revealAnswer,
    enterPodium,
    revealNextRank,
    finish,
  };
}
