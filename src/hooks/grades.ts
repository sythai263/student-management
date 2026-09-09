"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeGradeSession,
  createGradeSession,
  importGrades,
  saveGradesBulk,
} from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import type { Grade, GradeSession, Student } from "@types";

export interface GradeWithStudent extends Grade {
  students: Pick<Student, "studentCode" | "lastName" | "firstName"> | null;
}

/** Fetch a single grade round. */
export function useGradeSession(sessionId: string) {
  return useQuery({
    queryKey: ["gradeSession", sessionId],
    queryFn: async (): Promise<GradeSession> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("gradeSessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw new Error(error.message);
      return data as GradeSession;
    },
  });
}

/** List grade rounds for a class, newest first. */
export function useGradeSessions(classId: string) {
  return useQuery({
    queryKey: ["gradeSessions", classId],
    queryFn: async (): Promise<GradeSession[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("gradeSessions")
        .select("*")
        .eq("classId", classId)
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as GradeSession[];
    },
  });
}

/** Fetch grades of a round joined with student info. */
export function useGrades(sessionId: string) {
  return useQuery({
    queryKey: ["grades", sessionId],
    queryFn: async (): Promise<GradeWithStudent[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("grades")
        .select("*, students(studentCode, lastName, firstName)")
        .eq("gradeSessionId", sessionId);
      if (error) throw new Error(error.message);
      return (data ?? []) as GradeWithStudent[];
    },
  });
}

export interface CreateGradeSessionInput {
  classId: string;
  subjectId: string;
  semester: number;
  scoreType: string;
  name: string;
  date: string;
  weight: number;
}

interface SaveGradesInput {
  gradeSessionId: string;
  grades: { studentId: string; score: number; note?: string }[];
}

const gradeSessionsKey = (classId: string) => ["gradeSessions", classId];
const gradesKey = (sessionId: string) => ["grades", sessionId];

/** Mutation: create a new grade round. */
export function useCreateGradeSession(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGradeSessionInput) => {
      const result = await createGradeSession(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradeSessionsKey(classId) });
    },
  });
}

/** Mutation: save grades for a round and refresh the grade list. */
export function useSaveGrades(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveGradesInput) => {
      const result = await saveGradesBulk(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradesKey(sessionId) });
    },
  });
}

/** Mutation: import grades from a CSV file. */
export function useImportGrades(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await importGrades(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradesKey(sessionId) });
    },
  });
}

/** Mutation: close a grade round. */
export function useCloseGradeSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await closeGradeSession(sessionId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gradeSession", sessionId] });
    },
  });
}
