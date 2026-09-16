"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HostLobby } from "./host-lobby";
import { HostPodium } from "./host-podium";
import { HostQuestionCard } from "./host-question-card";
import { HostRevealCard } from "./host-reveal-card";
import { useHostRoom } from "./use-host-room";

interface HostRoomProps {
  sessionId: string;
}

/**
 * Teacher host view for a live quiz session. All realtime/game logic
 * lives in `useHostRoom` — this component only maps phases to views.
 */
export function HostRoom({ sessionId }: HostRoomProps) {
  const room = useHostRoom(sessionId);

  if (room.phase === "loading") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (room.phase === "error") {
    return (
      <main className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-destructive">{room.error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{room.data?.quiz.title}</h1>
          <p className="text-sm text-muted-foreground">
            Tự động đóng sau {Math.floor(room.roomSecondsLeft / 60)}:
            {String(room.roomSecondsLeft % 60).padStart(2, "0")} •{" "}
            {room.players.length} người chơi
          </p>
        </div>
        {room.phase !== "ended" && room.phase !== "podium" && (
          <Button variant="destructive" onClick={() => room.finish(true)}>
            Kết thúc
          </Button>
        )}
      </div>

      {room.phase === "lobby" && (
        <HostLobby
          pinCode={room.data?.session.pinCode ?? ""}
          players={room.players}
          totalQuestions={room.totalQuestions}
          onStart={() => void room.showQuestion(0)}
        />
      )}

      {room.phase === "question" && room.currentQuestion && (
        <HostQuestionCard
          question={room.currentQuestion}
          currentIndex={room.currentIndex}
          totalQuestions={room.totalQuestions}
          secondsLeft={room.secondsLeft}
          answeredCount={room.answeredCount}
          playerCount={room.players.length}
          onReveal={() => void room.revealAnswer()}
        />
      )}

      {room.phase === "reveal" && room.currentQuestion && room.reveal && (
        <HostRevealCard
          question={room.currentQuestion}
          currentIndex={room.currentIndex}
          totalQuestions={room.totalQuestions}
          reveal={room.reveal}
          leaderboard={room.leaderboard}
          onNext={() =>
            room.currentIndex + 1 < room.totalQuestions
              ? void room.showQuestion(room.currentIndex + 1)
              : room.enterPodium()
          }
        />
      )}

      {room.phase === "podium" && (
        <HostPodium
          leaderboard={room.leaderboard}
          revealedCount={room.podiumStep}
          finished={false}
          onRevealNext={() => void room.revealNextRank()}
          onFinish={() => void room.finish(true)}
        />
      )}

      {room.phase === "ended" && (
        <HostPodium
          leaderboard={room.leaderboard}
          revealedCount={3}
          finished
        />
      )}
    </main>
  );
}
