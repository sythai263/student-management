"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useQuiz } from "@hooks";
import { QuizEditor } from "./quiz-editor";

interface QuizEditorLoaderProps {
  quizId: string;
}

/** Loads an existing quiz then renders the editor — used by /quizzes/[id]. */
export function QuizEditorLoader({ quizId }: QuizEditorLoaderProps) {
  const { data, isLoading, error } = useQuiz(quizId);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error?.message ?? "Không tìm thấy quiz"}
      </p>
    );
  }
  return <QuizEditor quiz={data.quiz} questions={data.questions} />;
}
