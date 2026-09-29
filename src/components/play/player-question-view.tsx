"use client";

import { QUIZ_OPTION_STYLES } from "@constants";
import type { PublicQuestion } from "@types";

interface PlayerQuestionViewProps {
  question: PublicQuestion;
  secondsLeft: number;
  picked: number | null;
  locked: boolean;
  onAnswer: (choiceIndex: number) => void;
}

/** Question phase: big colored option buttons + countdown. */
export function PlayerQuestionView({
  question,
  secondsLeft,
  picked,
  locked,
  onAnswer,
}: PlayerQuestionViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Câu {question.index + 1}
        </span>
        <span className="font-mono text-lg">{secondsLeft}s</span>
      </div>
      <h2 className="text-xl font-semibold">{question.text}</h2>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || secondsLeft <= 0}
            onClick={() => onAnswer(i)}
            className={`flex min-h-20 items-center justify-center rounded-lg px-4 py-6 text-lg font-semibold text-white transition ${
              QUIZ_OPTION_STYLES[i % QUIZ_OPTION_STYLES.length]
            } ${picked === i ? "ring-4 ring-white/70" : ""} disabled:opacity-50`}
          >
            {opt}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className="text-center text-sm text-muted-foreground">
          Đã gửi câu trả lời. Chờ kết quả...
        </p>
      )}
    </div>
  );
}
