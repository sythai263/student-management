"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { getQuizSessionState } from "@lib/actions";
import {
  createRoomChannel,
  generateSigningKeys,
  getPlayerIdentity,
  importPrivateKey,
  importPublicKey,
  isSigningSupported,
  regeneratePlayerIdentity,
  removeRoomChannel,
  savePlayerIdentity,
  sendSignedEvent,
  verifyPayload,
} from "@lib/quiz";
import { QUIZ_EVENTS } from "@constants";
import type {
  AnswerPayload,
  EndPayload,
  LeaderboardEntry,
  PlayerHelloPayload,
  PlayerIdentity,
  PlayerPhase,
  PodiumPayload,
  PublicQuestion,
  QuestionPayload,
  QuizSessionInfo,
  RejectPayload,
  RevealPayload,
} from "@types";

export interface PlayerRoomState {
  phase: PlayerPhase;
  identity: PlayerIdentity | null;
  storageChecked: boolean;
  info: QuizSessionInfo | null;
  question: PublicQuestion | null;
  secondsLeft: number;
  picked: number | null;
  reveal: RevealPayload | null;
  /** Latest podium announcement (hạng 3 -> 2 -> 1), null until shown. */
  podium: PodiumPayload | null;
  leaderboard: LeaderboardEntry[];
  myEntry: LeaderboardEntry | undefined;
  myRank: number;
}

export interface PlayerRoomActions {
  joinWithName: (name: string) => void;
  answer: (choiceIndex: number) => Promise<void>;
}

/**
 * Player-side engine: DB pre-check, identity + keypair restore from
 * sessionStorage, signed broadcast handling, and strict channel cleanup.
 */
export function usePlayerRoom(
  sessionId: string,
): PlayerRoomState & PlayerRoomActions {
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [phase, setPhase] = useState<PlayerPhase>("joining");
  const [info, setInfo] = useState<QuizSessionInfo | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [podium, setPodium] = useState<PodiumPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const publicJwkRef = useRef<JsonWebKey | null>(null);
  const hostKeyRef = useRef<CryptoKey | null>(null);
  const identityRef = useRef<PlayerIdentity | null>(null);
  const lastAttemptRef = useRef<string>("");
  const questionEndsAtRef = useRef(0);
  const phaseRef = useRef<PlayerPhase>("joining");

  // Mirror latest state into refs for broadcast callbacks (passive
  // effect — ref writes are not allowed during render).
  useEffect(() => {
    phaseRef.current = phase;
    identityRef.current = identity;
  });

  // ----------------------------------------------------------------
  // Signing / verification helpers
  // ----------------------------------------------------------------
  const sendSigned = useCallback(
    (event: string, payload: Record<string, unknown>) =>
      sendSignedEvent(
        channelRef.current,
        privateKeyRef.current,
        event,
        payload,
      ),
    [],
  );

  /** Verify a host signature. If it fails, refetch the session state
   *  once — the host may have refreshed and rotated its keypair. */
  const verifyHost = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      if (!isSigningSupported()) return true; // degraded — see docs
      if (hostKeyRef.current) {
        if (await verifyPayload(hostKeyRef.current, payload)) return true;
      }
      const fresh = await getQuizSessionState(sessionId);
      if (fresh.success && fresh.data.hostPublicKey) {
        try {
          hostKeyRef.current = await importPublicKey(fresh.data.hostPublicKey);
          return await verifyPayload(hostKeyRef.current, payload);
        } catch {
          return false;
        }
      }
      return false;
    },
    [sessionId],
  );

  const sendHello = useCallback(async () => {
    const id = identityRef.current;
    if (!id) return;
    const attemptId = crypto.randomUUID();
    lastAttemptRef.current = attemptId;
    const payload: PlayerHelloPayload = {
      playerId: id.playerId,
      name: id.name,
      attemptId,
    };
    if (publicJwkRef.current) payload.publicKey = publicJwkRef.current;
    await sendSigned(QUIZ_EVENTS.PLAYER_HELLO, payload);
  }, [sendSigned]);

  // ----------------------------------------------------------------
  // Incoming host messages
  // ----------------------------------------------------------------
  const applyQuestion = useCallback((payload: QuestionPayload) => {
    questionEndsAtRef.current = payload.endsAt
      ? new Date(payload.endsAt).getTime()
      : Date.now() + payload.timeLimit * 1000;
    setQuestion({
      index: payload.index,
      text: payload.text,
      options: payload.options,
      timeLimit: payload.timeLimit,
      endsAt: payload.endsAt,
    });
    setPicked(null);
    setReveal(null);
    setPodium(null);
    setPhase("question");
  }, []);

  const onQuestion = useCallback(
    async (payload: QuestionPayload) => {
      if (!(await verifyHost(payload))) return;
      applyQuestion(payload);
    },
    [verifyHost, applyQuestion],
  );

  const onReveal = useCallback(
    async (payload: RevealPayload) => {
      if (!(await verifyHost(payload))) return;
      setReveal(payload);
      setLeaderboard(payload.leaderboard ?? []);
      setPhase("reveal");
    },
    [verifyHost],
  );

  /** Teacher-driven podium reveal: hạng 3 -> 2 -> 1 after the last question. */
  const onPodium = useCallback(
    async (payload: PodiumPayload) => {
      if (!(await verifyHost(payload))) return;
      setPodium(payload);
    },
    [verifyHost],
  );

  const onEnd = useCallback(
    async (payload: EndPayload) => {
      if (!(await verifyHost(payload))) return;
      setLeaderboard(payload.leaderboard ?? []);
      setPhase("ended");
      const ch = channelRef.current;
      channelRef.current = null;
      removeRoomChannel(clientRef.current, ch);
    },
    [verifyHost],
  );

  const onReject = useCallback(
    async (payload: RejectPayload) => {
      const id = identityRef.current;
      if (!id || payload.playerId !== id.playerId) return;
      if (payload.attemptId !== lastAttemptRef.current) return;
      if (!(await verifyHost(payload))) return;
      // Our playerId is bound to a different key — regenerate and rejoin.
      const next = regeneratePlayerIdentity(sessionId);
      if (!next) return;
      if (isSigningSupported()) {
        const keys = await generateSigningKeys();
        next.privateKeyJwk = keys.privateKeyJwk;
        next.publicKeyJwk = keys.publicKeyJwk;
        privateKeyRef.current = keys.privateKey;
        publicJwkRef.current = keys.publicKeyJwk;
        savePlayerIdentity(sessionId, next);
      }
      setIdentity(next);
      await sendHello();
    },
    [sessionId, verifyHost, sendHello],
  );

  // ----------------------------------------------------------------
  // Lifecycle: pre-check session in DB, restore identity + keypair,
  // subscribe to the room channel, clean up on unmount.
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    clientRef.current = supabase;

    async function init() {
      const res = await getQuizSessionState(sessionId);
      if (cancelled) return;
      if (!res.success) {
        setPhase("closed");
        return;
      }
      const state = res.data;
      setInfo(state);

      if (isSigningSupported()) {
        // Keypair before subscribing — player-hello needs a public key.
        if (identity!.privateKeyJwk && identity!.publicKeyJwk) {
          try {
            privateKeyRef.current = await importPrivateKey(
              identity!.privateKeyJwk,
            );
            publicJwkRef.current = identity!.publicKeyJwk;
          } catch {
            privateKeyRef.current = null;
            publicJwkRef.current = null;
          }
        }
        if (!privateKeyRef.current) {
          const keys = await generateSigningKeys();
          privateKeyRef.current = keys.privateKey;
          publicJwkRef.current = keys.publicKeyJwk;
          savePlayerIdentity(sessionId, {
            ...identity!,
            privateKeyJwk: keys.privateKeyJwk,
            publicKeyJwk: keys.publicKeyJwk,
          });
        }
        if (state.hostPublicKey) {
          try {
            hostKeyRef.current = await importPublicKey(state.hostPublicKey);
          } catch {
            hostKeyRef.current = null;
          }
        }
      } else {
        console.warn(
          "[quiz] crypto.subtle unavailable (non-secure context) — broadcast signatures disabled",
        );
      }

      const channel = createRoomChannel(supabase, sessionId, identity!.playerId);
      channelRef.current = channel;

      channel
        .on("broadcast", { event: QUIZ_EVENTS.HOST_HELLO }, () => {
          // Host (re)started — announce ourselves again so it rebinds.
          void sendHello();
        })
        .on("broadcast", { event: QUIZ_EVENTS.QUESTION }, ({ payload }) =>
          void onQuestion(payload as QuestionPayload),
        )
        .on("broadcast", { event: QUIZ_EVENTS.REVEAL }, ({ payload }) =>
          void onReveal(payload as RevealPayload),
        )
        .on("broadcast", { event: QUIZ_EVENTS.PODIUM }, ({ payload }) =>
          void onPodium(payload as PodiumPayload),
        )
        .on("broadcast", { event: QUIZ_EVENTS.END }, ({ payload }) =>
          void onEnd(payload as EndPayload),
        )
        .on("broadcast", { event: QUIZ_EVENTS.REJECT }, ({ payload }) =>
          void onReject(payload as RejectPayload),
        )
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel.track({ name: identity!.name });
          await sendHello();
          if (cancelled) return;
          // Rejoin mid-game: restore the live question from DB state.
          // Trusted source — no signature to verify here.
          if (state.status === "playing" && state.question) {
            applyQuestion({
              ...state.question,
              totalQuestions: state.questionCount,
            });
          } else {
            setPhase("lobby");
          }
        });
    }

    void init();

    const timer = setInterval(() => {
      if (
        phaseRef.current === "question" ||
        phaseRef.current === "answered"
      ) {
        setSecondsLeft(
          Math.max(
            0,
            Math.ceil((questionEndsAtRef.current - Date.now()) / 1000),
          ),
        );
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(timer);
      const ch = channelRef.current;
      channelRef.current = null;
      removeRoomChannel(supabase, ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, sessionId]);

  // Restore identity once on mount (async callback — sessionStorage is
  // browser-only and a sync setState in the effect body would cascade).
  useEffect(() => {
    const t = setTimeout(() => {
      setIdentity(getPlayerIdentity(sessionId));
      setStorageChecked(true);
    }, 0);
    return () => clearTimeout(t);
  }, [sessionId]);

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------
  const joinWithName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const id: PlayerIdentity = { playerId: crypto.randomUUID(), name: trimmed };
      savePlayerIdentity(sessionId, id);
      setIdentity(id);
    },
    [sessionId],
  );

  const answer = useCallback(
    async (choiceIndex: number) => {
      const id = identityRef.current;
      if (phaseRef.current !== "question" || !question || !id) return;
      setPicked(choiceIndex);
      setPhase("answered");
      const payload: AnswerPayload = {
        playerId: id.playerId,
        questionIndex: question.index,
        choiceIndex,
      };
      await sendSigned(QUIZ_EVENTS.ANSWER, payload);
    },
    [question, sendSigned],
  );

  const myEntry = leaderboard.find((e) => e.playerId === identity?.playerId);
  const myRank = leaderboard.findIndex(
    (e) => e.playerId === identity?.playerId,
  );

  return {
    phase,
    identity,
    storageChecked,
    info,
    question,
    secondsLeft,
    picked,
    reveal,
    podium,
    leaderboard,
    myEntry,
    myRank,
    joinWithName,
    answer,
  };
}
