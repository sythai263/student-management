"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { QUIZ_LEADERBOARD_ROW_H } from "@constants";
import { cn } from "cn";
import type { LeaderboardEntry } from "@types";

interface AnimatedLeaderboardProps {
  entries: LeaderboardEntry[];
  /** Board from the previous reveal — rows glide from their old rank
   *  and scores count up from their old value. */
  prevEntries?: LeaderboardEntry[];
}

/**
 * Leaderboard with animation: rows glide to their new rank (FLIP via
 * absolute positioning + translateY transition), a delta badge shows
 * how many places each player moved, and scores count up.
 * Row height is fixed so translateY math stays exact.
 */
export function AnimatedLeaderboard({
  entries,
  prevEntries = [],
}: AnimatedLeaderboardProps) {
  const prevRank = new Map(prevEntries.map((e, i) => [e.playerId, i]));
  const prevScore = new Map(prevEntries.map((e) => [e.playerId, e.score]));

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Chưa có điểm.</p>;
  }
  return (
    <div
      className="relative w-full"
      style={{ height: entries.length * QUIZ_LEADERBOARD_ROW_H }}
    >
      {entries.map((e, i) => (
        <LeaderboardRow
          key={e.playerId}
          entry={e}
          index={i}
          prevIndex={prevRank.get(e.playerId)}
          prevScore={prevScore.get(e.playerId)}
          entryCount={entries.length}
        />
      ))}
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  prevIndex: number | undefined;
  prevScore: number | undefined;
  entryCount: number;
}

/** One row: starts at its previous rank (new players slide in from
 *  below the list) then transitions to the target on mount. */
function LeaderboardRow({
  entry,
  index,
  prevIndex,
  prevScore,
  entryCount,
}: LeaderboardRowProps) {
  const from = prevIndex ?? entryCount;
  const target = index * QUIZ_LEADERBOARD_ROW_H;
  const [y, setY] = useState(from * QUIZ_LEADERBOARD_ROW_H);

  useEffect(() => {
    if (y === target) return;
    // Double rAF: paint the start position first so the transition runs.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setY(target)),
    );
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Positive delta = climbed up that many places.
  const delta = prevIndex === undefined ? 0 : prevIndex - index;

  return (
    <div
      className="absolute inset-x-0 transition-transform duration-700 ease-in-out"
      style={{
        transform: `translateY(${y}px)`,
        height: QUIZ_LEADERBOARD_ROW_H - 6,
      }}
    >
      <div className="flex h-full items-center justify-between rounded-md border px-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            {index + 1}. {entry.name}
          </span>
          {delta !== 0 && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-0.5 text-xs font-semibold",
                delta > 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {delta > 0 ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(delta)}
            </span>
          )}
        </span>
        <AnimatedScore value={entry.score} from={prevScore ?? 0} />
      </div>
    </div>
  );
}

interface AnimatedScoreProps {
  value: number;
  /** Score at the previous reveal — the tween starts here. */
  from: number;
}

/** Tweens a score from its previous value to the new one (ease-out). */
function AnimatedScore({ value, from }: AnimatedScoreProps) {
  const [display, setDisplay] = useState(from);
  const prevRef = useRef(from);

  useEffect(() => {
    const start = prevRef.current;
    prevRef.current = value;
    if (start === value) {
      setDisplay(value);
      return;
    }
    const duration = 700;
    const startTime = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTime) / duration);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="font-mono tabular-nums">{display}</span>;
}
