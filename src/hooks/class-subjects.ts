"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignSubjectToClass,
  removeSubjectFromClass,
} from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { ClassSubjectWithSubject } from "@types";

const classSubjectsKey = (classId: string) => ["class-subjects", classId];

/** Fetch the subjects assigned to a class. */
export function useClassSubjects(classId: string) {
  return useQuery({
    queryKey: classSubjectsKey(classId),
    queryFn: async (): Promise<ClassSubjectWithSubject[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("classSubjects")
        .select("*, subjects(name, code)")
        .eq("classId", classId)
        .order("createdAt", { ascending: true });
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as ClassSubjectWithSubject[];
    },
    enabled: !!classId,
  });
}

interface AssignInput {
  classId: string;
  subjectId: string;
}

/** Mutation: assign a subject to a class. */
export function useAssignClassSubject(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignInput) => {
      const result = await assignSubjectToClass(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classSubjectsKey(classId) });
    },
  });
}

/** Mutation: remove a subject from a class. */
export function useRemoveClassSubject(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classSubjectId: string) => {
      const result = await removeSubjectFromClass(classSubjectId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classSubjectsKey(classId) });
    },
  });
}
