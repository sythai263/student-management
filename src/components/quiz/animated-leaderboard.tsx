"use client";

import { useEffect, useRef, useState } from "react";
import { QUIZ_LEADERBOARD_ROW_H } from "@constants";
import type { LeaderboardEntry } from "@types";

interface AnimatedLeaderboardProps {
  entries: LeaderboardEntry[];
}

/**
 * Leaderboard with animation: rows glide to their new rank (FLIP via
 * absolute positioning + translateY transition) and scores count up.
 * Row height is fixed so translateY math stays exact.
 */
export function AnimatedLeaderboard({ entries }: AnimatedLeaderboardProps) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Chưa có điểm.</p>;
  }
  return (
    <div
      className="relative w-full"
      style={{ height: entries.length * QUIZ_LEADERBOARD_ROW_H }}
    >
      {entries.map((e, i) => (
        <div
          key={e.playerId}
          className="absolute inset-x-0 transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateY(${i * QUIZ_LEADERBOARD_ROW_H}px)`,
            height: QUIZ_LEADERBOARD_ROW_H - 6,
          }}
        >
          <div className="flex h-full items-center justify-between rounded-md border px-3 text-sm">
            <span className="truncate">
              {i + 1}. {e.name}
            </span>
            <AnimatedScore value={e.score} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AnimatedScoreProps {
  value: number;
}

/** Tweens a score from its previous value to the new one (ease-out). */
function AnimatedScore({ value }: AnimatedScoreProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;
    const duration = 700;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="font-mono tabular-nums">{display}</span>;
}
