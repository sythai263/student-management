"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import type { LeaderboardEntry } from "@types";

interface PodiumSlot {
  rank: number;
  heightClass: string;
  medalClass: string;
}

/** Visual order: 2nd | 1st | 3rd (classic podium layout). */
const SLOTS: PodiumSlot[] = [
  { rank: 2, heightClass: "h-28", medalClass: "bg-slate-400/20 border-slate-400" },
  { rank: 1, heightClass: "h-40", medalClass: "bg-amber-400/20 border-amber-400" },
  { rank: 3, heightClass: "h-20", medalClass: "bg-orange-700/20 border-orange-700" },
];

interface HostPodiumProps {
  leaderboard: LeaderboardEntry[];
  /** How many ranks revealed so far (1 -> hạng 3, 2 -> hạng 2, 3 -> hạng 1). */
  revealedCount: number;
  /** True after the session has been saved/closed. */
  finished: boolean;
  onRevealNext?: () => void;
  onFinish?: () => void;
}

/**
 * Podium ceremony after the last question: the teacher reveals ranks
 * manually 3 -> 2 -> 1 instead of showing the full leaderboard.
 */
export function HostPodium({
  leaderboard,
  revealedCount,
  finished,
  onRevealNext,
  onFinish,
}: HostPodiumProps) {
  const router = useRouter();
  const allRevealed = revealedCount >= 3;
  const nextRank = 3 - revealedCount;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-8 pt-8">
        <div className="flex items-end justify-center gap-4">
          {SLOTS.map(({ rank, heightClass, medalClass }) => {
            const entry = leaderboard[rank - 1];
            const shown = rank >= 4 - revealedCount;
            return (
              <div
                key={rank}
                className="flex w-36 flex-col items-center gap-2"
              >
                <div className="flex h-16 flex-col items-center justify-end text-center">
                  {shown && entry ? (
                    <>
                      <span className="max-w-full truncate text-base font-semibold">
                        {entry.name}
                      </span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {entry.score}đ
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl text-muted-foreground">?</span>
                  )}
                </div>
                <div
                  className={cn(
                    "flex w-full items-start justify-center rounded-t-md border-b-0 pt-3 text-2xl font-bold transition-all duration-500",
                    heightClass,
                    medalClass,
                    !shown && "opacity-40",
                  )}
                >
                  {rank}
                </div>
              </div>
            );
          })}
        </div>

        {finished ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Phòng đã đóng, kết quả đã được lưu.
            </p>
            <Button onClick={() => router.push("/quizzes")}>
              Về trang quiz
            </Button>
          </div>
        ) : !allRevealed ? (
          <Button size="lg" onClick={onRevealNext}>
            Công bố hạng {nextRank}
          </Button>
        ) : (
          <Button size="lg" onClick={onFinish}>
            Kết thúc & lưu kết quả
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
