"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuizQuestion } from "@types";

interface HostQuestionCardProps {
  question: QuizQuestion;
  currentIndex: number;
  totalQuestions: number;
  secondsLeft: number;
  onReveal: () => void;
}

/** Question phase: shows the prompt/options plus a big countdown. */
export function HostQuestionCard({
  question,
  currentIndex,
  totalQuestions,
  secondsLeft,
  onReveal,
}: HostQuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>
            Câu {currentIndex + 1}/{totalQuestions}
          </CardDescription>
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary font-mono text-4xl font-bold tabular-nums">
            {secondsLeft}
          </div>
        </div>
        <CardTitle className="text-2xl">{question.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt, i) => (
            <div key={i} className="rounded-md border px-4 py-3 text-sm">
              {opt}
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={onReveal}>
          Hiện đáp án
        </Button>
      </CardContent>
    </Card>
  );
}
