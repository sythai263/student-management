"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PlayerEndedView } from "./player-ended-view";
import { PlayerNameForm } from "./player-name-form";
import { PlayerQuestionView } from "./player-question-view";
import { PlayerRevealView } from "./player-reveal-view";
import { usePlayerRoom } from "./use-player-room";

interface PlayerScreenProps {
  sessionId: string;
}

/**
 * Student play view for a live quiz session. All realtime/identity
 * logic lives in `usePlayerRoom` — this component maps phases to views.
 */
export function PlayerScreen({ sessionId }: PlayerScreenProps) {
  const room = usePlayerRoom(sessionId);

  if (!room.storageChecked || room.phase === "joining") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Skeleton className="h-40 w-full max-w-sm" />
      </main>
    );
  }

  if (!room.identity) {
    return <PlayerNameForm onSubmit={room.joinWithName} />;
  }

  if (room.phase === "closed") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-sm text-destructive">
          Phòng đã đóng hoặc không tồn tại.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col p-6">
      <div className="flex items-center justify-between py-4">
        <span className="text-sm font-medium">{room.identity.name}</span>
        <span className="text-sm text-muted-foreground">
          {room.info?.quizTitle ?? "Quiz"}
        </span>
      </div>

      {room.phase === "lobby" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-2xl font-semibold">Bạn đã vào phòng!</h2>
          <p className="text-muted-foreground">
            Chờ thầy/cô bắt đầu. Giữ nguyên màn hình này.
          </p>
        </div>
      )}

      {(room.phase === "question" || room.phase === "answered") &&
        room.question && (
          <PlayerQuestionView
            question={room.question}
            secondsLeft={room.secondsLeft}
            picked={room.picked}
            locked={room.phase === "answered"}
            onAnswer={(i) => void room.answer(i)}
          />
        )}

      {room.phase === "reveal" && room.reveal && room.question && (
        <PlayerRevealView
          question={room.question}
          reveal={room.reveal}
          picked={room.picked}
          myEntry={room.myEntry}
        />
      )}

      {room.phase === "ended" && (
        <PlayerEndedView
          leaderboard={room.leaderboard}
          playerId={room.identity.playerId}
          myEntry={room.myEntry}
          myRank={room.myRank}
        />
      )}
    </main>
  );
}
