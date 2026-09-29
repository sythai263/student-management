"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteQuiz, saveQuiz } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { Quiz, QuizQuestion } from "@types";

/** Fetch all quizzes owned by the current teacher. */
export function useQuizzes() {
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: async (): Promise<Quiz[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as Quiz[];
    },
  });
}

/** Fetch a single quiz with its questions (for the editor). */
export function useQuiz(quizId: string) {
  return useQuery({
    queryKey: ["quizzes", quizId],
    queryFn: async (): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> => {
      const supabase = createSupabaseBrowserClient();
      const [{ data: quiz, error: qError }, { data: questions, error: qsError }] =
        await Promise.all([
          supabase.from("quizzes").select("*").eq("id", quizId).single(),
          supabase
            .from("quizQuestions")
            .select("*")
            .eq("quizId", quizId)
            .order("orderIndex"),
        ]);
      if (qError) throw new Error(friendlyErrorMessage(qError));
      if (qsError) throw new Error(friendlyErrorMessage(qsError));
      return {
        quiz: quiz as Quiz,
        questions: (questions ?? []) as QuizQuestion[],
      };
    },
  });
}

/** Create or update a quiz (with questions) and refresh the list. */
export function useSaveQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await saveQuiz(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
}

/** Delete a quiz and refresh the list. */
export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quizId: string) => {
      const result = await deleteQuiz(quizId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
}
