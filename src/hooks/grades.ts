"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importGrades, saveGradeComment, saveGradesBulk } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { GradeWithStudent, Student } from "@types";

const gradesKey = (classId: string, subjectId: string, semester: number) => [
  "grades",
  classId,
  subjectId,
  semester,
];

/** Fetch the 6-score grade sheet for a class/subject/semester. */
export function useGrades(
  classId: string,
  subjectId: string,
  semester: number,
) {
  return useQuery({
    queryKey: gradesKey(classId, subjectId, semester),
    queryFn: async (): Promise<GradeWithStudent[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("grades")
        .select("*, students(studentCode, lastName, firstName)")
        .eq("classId", classId)
        .eq("subjectId", subjectId)
        .eq("semester", semester)
        .order("createdAt", { ascending: true });
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as GradeWithStudent[];
    },
    enabled: !!classId && !!subjectId && semester > 0,
  });
}

export interface GradeRowInput {
  studentId: string;
  tx1: number | null;
  tx2: number | null;
  tx3: number | null;
  tx4: number | null;
  gk: number | null;
  ck: number | null;
  note?: string | null;
}

export interface SaveGradesInput {
  classId: string;
  subjectId: string;
  semester: number;
  grades: GradeRowInput[];
}

/** Mutation: save the grade sheet and refresh the grade list. */
export function useSaveGrades(
  classId: string,
  subjectId: string,
  semester: number,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveGradesInput) => {
      const result = await saveGradesBulk(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gradesKey(classId, subjectId, semester),
      });
    },
  });
}

/** Mutation: save one student's comment immediately (from the comment dialog). */
export function useSaveGradeComment(
  classId: string,
  subjectId: string,
  semester: number,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      comment: string | null;
    }) => {
      const result = await saveGradeComment({
        classId,
        subjectId,
        semester,
        ...input,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gradesKey(classId, subjectId, semester),
      });
    },
  });
}

/** Mutation: import grades from a CSV file. */
export function useImportGrades(
  classId: string,
  subjectId: string,
  semester: number,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await importGrades(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gradesKey(classId, subjectId, semester),
      });
    },
  });
}
