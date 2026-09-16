import { QuizLeaderboard } from "@components/quiz";
import type { LeaderboardEntry } from "@types";

interface PlayerEndedViewProps {
  leaderboard: LeaderboardEntry[];
  playerId: string;
  myEntry: LeaderboardEntry | undefined;
  myRank: number;
}

/** Final phase: rank + full top-10 scoreboard. */
export function PlayerEndedView({
  leaderboard,
  playerId,
  myEntry,
  myRank,
}: PlayerEndedViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">Kết thúc!</h2>
      {myEntry && (
        <p className="text-lg">
          Bạn xếp hạng #{myRank + 1} với{" "}
          <span className="font-mono">{myEntry.score}</span> điểm
        </p>
      )}
      <QuizLeaderboard
        entries={leaderboard.slice(0, 10)}
        highlightPlayerId={playerId}
      />
    </div>
  );
}
