"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import {
  advanceQuizQuestion,
  finishQuizSession,
  getHostSessionData,
  setSessionHostKey,
  type HostSessionData,
} from "@lib/actions";
import {
  generateSigningKeys,
  importPublicKey,
  isSigningSupported,
  signPayload,
  verifyPayload,
  type SigningKeys,
} from "@lib/quiz";
import {
  QUIZ_ANSWER_GRACE_MS,
  QUIZ_CHANNEL_PREFIX,
  QUIZ_DEFAULT_TIMEOUT_MINUTES,
  QUIZ_EVENTS,
  QUIZ_HOST_PRESENCE_KEY,
  QUIZ_SCORE_BASE,
  QUIZ_SCORE_TIME_BONUS,
} from "@constants";
import type {
  AnswerPayload,
  HostHelloPayload,
  LeaderboardEntry,
  PlayerHelloPayload,
  QuizQuestion,
  RejectPayload,
} from "@types";

type HostPhase = "loading" | "lobby" | "question" | "reveal" | "ended" | "error";

interface PlayerState {
  playerId: string;
  name: string;
  publicKey: CryptoKey | null;
  publicKeyJwk?: JsonWebKey;
  score: number;
  correctCount: number;
}

interface RevealState {
  correctIndex: number;
  counts: number[];
}

const ROOM_TIMEOUT_MS =
  (Number(process.env.NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES) ||
    QUIZ_DEFAULT_TIMEOUT_MINUTES) *
  60 *
  1000;

function sameJwk(a?: JsonWebKey, b?: JsonWebKey): boolean {
  if (!a || !b) return !a && !b;
  return a.x === b.x && a.y === b.y && a.kty === b.kty;
}

function toLeaderboard(players: Map<string, PlayerState>): LeaderboardEntry[] {
  return [...players.values()]
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      score: p.score,
      correctCount: p.correctCount,
    }))
    .sort((a, b) => b.score - a.score);
}

export function HostRoom({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<HostPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HostSessionData | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roomSecondsLeft, setRoomSecondsLeft] = useState(
    Math.floor(ROOM_TIMEOUT_MS / 1000),
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);
  const hostKeysRef = useRef<SigningKeys | null>(null);
  const pendingFinishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playersRef = useRef(new Map<string, PlayerState>());
  const answeredRef = useRef(new Set<string>());
  const countsRef = useRef<number[]>([]);
  const endsAtRef = useRef(0);
  const phaseRef = useRef<HostPhase>("loading");
  const finishedRef = useRef(false);
  const roomDeadlineRef = useRef(0);
  const indexRef = useRef(-1);
  const questionsRef = useRef<QuizQuestion[]>([]);
  const dataRef = useRef<HostSessionData | null>(null);

  const questions: QuizQuestion[] = data?.questions ?? [];
  const currentQuestion =
    currentIndex >= 0 ? (questions[currentIndex] ?? null) : null;

  // ----------------------------------------------------------------
  // Broadcast helper — signs every host message when crypto is available.
  // ----------------------------------------------------------------
  const sendSigned = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      const keys = hostKeysRef.current;
      const body = { ...payload };
      if (keys) body.sig = await signPayload(keys.privateKey, body);
      await channelRef.current?.send({ type: "broadcast", event, payload: body });
    },
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
        if (sameJwk(existing.publicKeyJwk, payload.publicKey)) {
          existing.name = payload.name;
          setPlayers([...playersRef.current.values()]);
        } else {
          await rejectPlayer(payload.playerId, payload.attemptId, "ID đã được sử dụng");
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
            await rejectPlayer(payload.playerId, payload.attemptId, "Chữ ký không hợp lệ");
            return;
          }
        } catch {
          await rejectPlayer(payload.playerId, payload.attemptId, "Không xác thực được");
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
    if (payload.questionIndex !== currentIndexRefSafe()) return;
    if (Date.now() > endsAtRef.current + QUIZ_ANSWER_GRACE_MS) return;
    if (answeredRef.current.has(payload.playerId)) return;

    const player = playersRef.current.get(payload.playerId);
    if (!player) return;
    if (isSigningSupported() && player.publicKey) {
      if (!(await verifyPayload(player.publicKey, payload))) return;
    }

    answeredRef.current.add(payload.playerId);
    const q = questionsRefSafe();
    if (!q) return;
    if (payload.choiceIndex < 0 || payload.choiceIndex >= q.options.length)
      return;
    countsRef.current[payload.choiceIndex] =
      (countsRef.current[payload.choiceIndex] ?? 0) + 1;

    const correct = payload.choiceIndex === q.correctIndex;
    if (correct) {
      const remaining = Math.max(0, endsAtRef.current - Date.now());
      player.score +=
        QUIZ_SCORE_BASE +
        Math.round(
          (QUIZ_SCORE_TIME_BONUS * remaining) / (q.timeLimit * 1000),
        );
      player.correctCount += 1;
    }
    setAnsweredCount(answeredRef.current.size);
  }, []);

  // helpers reading refs (kept stable for useCallback deps)
  function currentIndexRefSafe() {
    return indexRef.current;
  }
  function questionsRefSafe() {
    return questionsRef.current[indexRef.current] ?? null;
  }

  // ----------------------------------------------------------------
  // Game flow
  // ----------------------------------------------------------------
  const showQuestion = useCallback(
    async (index: number) => {
      const q = questionsRef.current[index];
      if (!q || !dataRefSafe()) return;
      const endsAt = new Date(Date.now() + q.timeLimit * 1000).toISOString();
      await advanceQuizQuestion(sessionId, index, endsAt);
      endsAtRef.current = Date.now() + q.timeLimit * 1000;
      answeredRef.current = new Set();
      countsRef.current = new Array(q.options.length).fill(0);
      setCurrentIndex(index);
      setAnsweredCount(0);
      setReveal(null);
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

  function dataRefSafe() {
    return dataRef.current;
  }

  const doReveal = useCallback(async () => {
    if (phaseRef.current !== "question") return;
    const q = questionsRefSafe();
    if (!q) return;
    const board = toLeaderboard(playersRef.current);
    setReveal({ correctIndex: q.correctIndex, counts: countsRef.current });
    setLeaderboard(board);
    setPhase("reveal");
    await sendSigned(QUIZ_EVENTS.REVEAL, {
      index: q.orderIndex,
      correctIndex: q.correctIndex,
      counts: countsRef.current,
      leaderboard: board.slice(0, 10),
    });
  }, [sendSigned]);

  const finish = useCallback(
    async (broadcastEnd: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const board = toLeaderboard(playersRef.current);
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
      if (ch) void clientRef.current?.removeChannel(ch);
    },
    [sendSigned, sessionId],
  );

  const finishRef = useRef(finish);

  // Mirror latest state into refs for broadcast callbacks and timers
  // (passive effect — ref writes are not allowed during render).
  useEffect(() => {
    phaseRef.current = phase;
    indexRef.current = currentIndex;
    questionsRef.current = questions;
    dataRef.current = data;
    finishRef.current = finish;
  });

  // ----------------------------------------------------------------
  // Lifecycle: load session, generate host key, open channel, and run
  // the auto-close countdown (NEXT_PUBLIC_QUIZ_TIMEOUT_MINUTES).
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

      const channel = supabase.channel(`${QUIZ_CHANNEL_PREFIX}${sessionId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: QUIZ_HOST_PRESENCE_KEY },
        },
      });
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

      roomDeadlineRef.current = Date.now() + ROOM_TIMEOUT_MS;
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
        if (left <= 0) void doRevealRefSafe();
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(timer);
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void supabase.removeChannel(ch);
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

  function doRevealRefSafe() {
    return doReveal();
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{data?.quiz.title}</h1>
          <p className="text-sm text-muted-foreground">
            Tự động đóng sau {Math.floor(roomSecondsLeft / 60)}:
            {String(roomSecondsLeft % 60).padStart(2, "0")} •{" "}
            {players.length} người chơi
          </p>
        </div>
        {phase !== "ended" && (
          <Button variant="destructive" onClick={() => finish(true)}>
            Kết thúc
          </Button>
        )}
      </div>

      {phase === "lobby" && (
        <Card>
          <CardHeader className="items-center text-center">
            <CardDescription>Học sinh vào đường dẫn /play và nhập mã</CardDescription>
            <CardTitle className="font-mono text-6xl tracking-[0.3em]">
              {data?.session.pinCode}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <Badge key={p.playerId} variant="secondary">
                  {p.name}
                </Badge>
              ))}
              {players.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Đang chờ học sinh tham gia...
                </p>
              )}
            </div>
            <div className="flex justify-center">
              <Button size="lg" onClick={() => showQuestion(0)}>
                Bắt đầu ({questions.length} câu hỏi)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "question" && currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>
                Câu {currentIndex + 1}/{questions.length} • đã trả lời{" "}
                {answeredCount}/{players.length}
              </CardDescription>
              <Badge variant="outline" className="text-lg">
                {secondsLeft}s
              </Badge>
            </div>
            <CardTitle className="text-2xl">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className="rounded-md border px-4 py-3 text-sm"
                >
                  {opt}
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={doReveal}>
              Hiện đáp án
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "reveal" && currentQuestion && reveal && (
        <Card>
          <CardHeader>
            <CardDescription>
              Câu {currentIndex + 1}/{questions.length}
            </CardDescription>
            <CardTitle className="text-2xl">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={
                    i === reveal.correctIndex
                      ? "rounded-md border border-green-500 bg-green-500/10 px-4 py-3 text-sm"
                      : "rounded-md border px-4 py-3 text-sm opacity-60"
                  }
                >
                  {opt} • {reveal.counts[i] ?? 0} chọn
                </div>
              ))}
            </div>
            <Leaderboard entries={leaderboard.slice(0, 10)} />
            <Button
              onClick={() =>
                currentIndex + 1 < questions.length
                  ? showQuestion(currentIndex + 1)
                  : finish(true)
              }
            >
              {currentIndex + 1 < questions.length
                ? "Câu tiếp theo"
                : "Kết thúc & lưu kết quả"}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "ended" && (
        <Card>
          <CardHeader>
            <CardTitle>Bảng xếp hạng cuối cùng</CardTitle>
            <CardDescription>
              Phòng đã đóng, kết quả đã được lưu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Leaderboard entries={leaderboard} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Chưa có điểm.</p>;
  }
  return (
    <ol className="space-y-1">
      {entries.map((e, i) => (
        <li
          key={e.playerId}
          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
        >
          <span>
            {i + 1}. {e.name}
          </span>
          <span className="font-mono">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}
