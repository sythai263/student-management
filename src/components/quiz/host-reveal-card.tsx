"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedLeaderboard } from "./animated-leaderboard";
import type { HostRevealState, LeaderboardEntry, QuizQuestion } from "@types";

interface HostRevealCardProps {
  question: QuizQuestion;
  currentIndex: number;
  totalQuestions: number;
  reveal: HostRevealState;
  leaderboard: LeaderboardEntry[];
  onNext: () => void;
}

/** Reveal phase: correct option, per-option pick counts, top-10 board. */
export function HostRevealCard({
  question,
  currentIndex,
  totalQuestions,
  reveal,
  leaderboard,
  onNext,
}: HostRevealCardProps) {
  const isLast = currentIndex + 1 >= totalQuestions;
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Câu {currentIndex + 1}/{totalQuestions}
        </CardDescription>
        <CardTitle className="text-2xl">{question.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt, i) => (
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
        <AnimatedLeaderboard entries={leaderboard.slice(0, 10)} />
        <Button onClick={onNext}>
          {isLast ? "Công bố kết quả" : "Câu tiếp theo"}
        </Button>
      </CardContent>
    </Card>
  );
}
