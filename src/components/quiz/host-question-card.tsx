"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  answeredCount: number;
  playerCount: number;
  onReveal: () => void;
}

/** Question phase: shows the prompt/options plus live answer progress. */
export function HostQuestionCard({
  question,
  currentIndex,
  totalQuestions,
  secondsLeft,
  answeredCount,
  playerCount,
  onReveal,
}: HostQuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>
            Câu {currentIndex + 1}/{totalQuestions} • đã trả lời{" "}
            {answeredCount}/{playerCount}
          </CardDescription>
          <Badge variant="outline" className="text-lg">
            {secondsLeft}s
          </Badge>
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
