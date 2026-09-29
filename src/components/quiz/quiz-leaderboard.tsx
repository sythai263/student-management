import { Trophy } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import type { LeaderboardEntry } from "@types";

interface QuizLeaderboardProps {
  entries: LeaderboardEntry[];
  highlightPlayerId?: string;
}

/** Shared scoreboard — host reveal/ended views and the player's final screen. */
export function QuizLeaderboard({
  entries,
  highlightPlayerId,
}: QuizLeaderboardProps) {
  if (!entries.length) {
    return (
      <Empty className="gap-2 p-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trophy />
          </EmptyMedia>
          <EmptyTitle>Chưa có điểm.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ol className="w-full space-y-1">
      {entries.map((e, i) => (
        <li
          key={e.playerId}
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
            e.playerId === highlightPlayerId ? "border-primary" : ""
          }`}
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
