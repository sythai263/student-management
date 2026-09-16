"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { getQuizSessionState } from "@lib/actions";
import {
  generateSigningKeys,
  getPlayerIdentity,
  importPrivateKey,
  importPublicKey,
  isSigningSupported,
  regeneratePlayerIdentity,
  savePlayerIdentity,
  signPayload,
  verifyPayload,
  type PlayerIdentity,
} from "@lib/quiz";
import { QUIZ_CHANNEL_PREFIX, QUIZ_EVENTS } from "@constants";
import type {
  AnswerPayload,
  EndPayload,
  LeaderboardEntry,
  PlayerHelloPayload,
  PublicQuestion,
  QuestionPayload,
  QuizSessionInfo,
  RejectPayload,
  RevealPayload,
} from "@types";

type PlayerPhase =
  | "joining"
  | "lobby"
  | "question"
  | "answered"
  | "reveal"
  | "ended"
  | "closed";

const OPTION_STYLES = [
  "bg-red-600 hover:bg-red-500",
  "bg-blue-600 hover:bg-blue-500",
  "bg-amber-500 hover:bg-amber-400",
  "bg-green-600 hover:bg-green-500",
  "bg-purple-600 hover:bg-purple-500",
  "bg-pink-600 hover:bg-pink-500",
];

export function PlayerScreen({ sessionId }: { sessionId: string }) {
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phase, setPhase] = useState<PlayerPhase>("joining");
  const [info, setInfo] = useState<QuizSessionInfo | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
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
    async (event: string, payload: Record<string, unknown>) => {
      const body = { ...payload };
      if (privateKeyRef.current) {
        body.sig = await signPayload(privateKeyRef.current, body);
      }
      await channelRef.current?.send({ type: "broadcast", event, payload: body });
    },
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

  const onEnd = useCallback(
    async (payload: EndPayload) => {
      if (!(await verifyHost(payload))) return;
      setLeaderboard(payload.leaderboard ?? []);
      setPhase("ended");
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void clientRef.current?.removeChannel(ch);
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

      const channel = supabase.channel(`${QUIZ_CHANNEL_PREFIX}${sessionId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: identity!.playerId },
        },
      });
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
      if (ch) void supabase.removeChannel(ch);
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
  async function answer(choiceIndex: number) {
    if (phase !== "question" || picked !== null || !question || !identity)
      return;
    setPicked(choiceIndex);
    setPhase("answered");
    const payload: AnswerPayload = {
      playerId: identity.playerId,
      questionIndex: question.index,
      choiceIndex,
    };
    await sendSigned(QUIZ_EVENTS.ANSWER, payload);
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    const id: PlayerIdentity = { playerId: crypto.randomUUID(), name };
    savePlayerIdentity(sessionId, id);
    setIdentity(id);
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  if (!storageChecked) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Skeleton className="h-40 w-full max-w-sm" />
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Tham gia phòng</CardTitle>
            <CardDescription>Nhập tên hiển thị của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player-name">Tên hiển thị</Label>
                <Input
                  id="player-name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={40}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Vào phòng
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (phase === "joining") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Skeleton className="h-40 w-full max-w-sm" />
      </main>
    );
  }

  if (phase === "closed") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-sm text-destructive">
          Phòng đã đóng hoặc không tồn tại.
        </p>
      </main>
    );
  }

  const myEntry = leaderboard.find((e) => e.playerId === identity.playerId);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col p-6">
      <div className="flex items-center justify-between py-4">
        <span className="text-sm font-medium">{identity.name}</span>
        <span className="text-sm text-muted-foreground">
          {info?.quizTitle ?? "Quiz"}
        </span>
      </div>

      {phase === "lobby" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-2xl font-semibold">Bạn đã vào phòng!</h2>
          <p className="text-muted-foreground">
            Chờ thầy/cô bắt đầu. Giữ nguyên màn hình này.
          </p>
        </div>
      )}

      {(phase === "question" || phase === "answered") && question && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Câu {question.index + 1}
            </span>
            <span className="font-mono text-lg">{secondsLeft}s</span>
          </div>
          <h2 className="text-xl font-semibold">{question.text}</h2>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={phase === "answered" || secondsLeft <= 0}
                onClick={() => answer(i)}
                className={`flex min-h-20 items-center justify-center rounded-lg px-4 py-6 text-lg font-semibold text-white transition ${OPTION_STYLES[i % OPTION_STYLES.length]
                  } ${picked === i ? "ring-4 ring-white/70" : ""} disabled:opacity-50`}
              >
                {opt}
              </button>
            ))}
          </div>
          {phase === "answered" && (
            <p className="text-center text-sm text-muted-foreground">
              Đã gửi câu trả lời. Chờ kết quả...
            </p>
          )}
        </div>
      )}

      {phase === "reveal" && reveal && question && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">
            {picked !== null && picked === reveal.correctIndex
              ? "Chính xác!"
              : picked === null
                ? "Hết giờ!"
                : "Chưa đúng!"}
          </h2>
          <p className="text-muted-foreground">
            Đáp án đúng: {question.options[reveal.correctIndex]}
          </p>
          {myEntry && (
            <p className="text-lg">
              Điểm của bạn: <span className="font-mono">{myEntry.score}</span>
            </p>
          )}
        </div>
      )}

      {phase === "ended" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-semibold">Kết thúc!</h2>
          {myEntry && (
            <p className="text-lg">
              Bạn xếp hạng #
              {leaderboard.findIndex((e) => e.playerId === identity.playerId) +
                1}{" "}
              với <span className="font-mono">{myEntry.score}</span> điểm
            </p>
          )}
          <ol className="w-full space-y-1">
            {leaderboard.slice(0, 10).map((e, i) => (
              <li
                key={e.playerId}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${e.playerId === identity.playerId ? "border-primary" : ""
                  }`}
              >
                <span>
                  {i + 1}. {e.name}
                </span>
                <span className="font-mono">{e.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
