"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importGrades, saveGradeComment, saveGradesBulk } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { studentFullName } from "@lib/string";
import { friendlyErrorMessage } from "@lib/utils";
import type { GradeWithStudent, HonorRollEntry } from "@types";

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
        .select("*, students(studentCode, lastName, firstName, nameSuffix)")
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

/**
 * Honor roll: rank students by the weighted count of high (>= 9)
 * scores — each TX counts 1, a GK counts 2, a CK counts 3.
 */
export function useHonorRoll(
  classId: string,
  subjectId: string,
  semester: number,
  limit = 5,
) {
  return useQuery({
    queryKey: [...gradesKey(classId, subjectId, semester), "honor-roll", limit],
    queryFn: async (): Promise<HonorRollEntry[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("grades")
        .select(
          "studentId, tx1, tx2, tx3, tx4, gk, ck, students(studentCode, lastName, firstName, nameSuffix)",
        )
        .eq("classId", classId)
        .eq("subjectId", subjectId)
        .eq("semester", semester)
        .or("tx1.gte.9,tx2.gte.9,tx3.gte.9,tx4.gte.9,gk.gte.9,ck.gte.9");
      if (error) throw new Error(friendlyErrorMessage(error));

      const entries = (data ?? []).map((row) => {
        const g = row as unknown as Pick<
          GradeWithStudent,
          "studentId" | "tx1" | "tx2" | "tx3" | "tx4" | "gk" | "ck" | "students"
        >;
        const tx9 = [g.tx1, g.tx2, g.tx3, g.tx4].filter(
          (v) => Number(v) >= 9,
        ).length;
        const gk9 = Number(g.gk) >= 9 ? 1 : 0;
        const ck9 = Number(g.ck) >= 9 ? 1 : 0;
        return {
          studentId: g.studentId,
          studentCode: g.students?.studentCode ?? null,
          studentName: g.students ? studentFullName(g.students) : "—",
          tx9,
          gk9,
          ck9,
          score: tx9 + gk9 * 2 + ck9 * 3,
        } satisfies HonorRollEntry;
      });

      return entries
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.studentName.localeCompare(b.studentName, "vi"),
        )
        .slice(0, limit);
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
