"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import {
  createViolations,
  deleteViolation,
  type ActionResult,
} from "@lib/actions";
import { friendlyErrorMessage } from "@lib/utils";
import type { StudentViolationWithStudent } from "@types";

const violationsKey = (classId: string) => ["violations", classId] as const;

/** Fetch violation records of a class, newest first. */
export function useViolations(classId: string) {
  return useQuery({
    queryKey: violationsKey(classId),
    queryFn: async (): Promise<StudentViolationWithStudent[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("studentViolations")
        .select("*, students(studentCode, lastName, firstName, nameSuffix)")
        .eq("classId", classId)
        .order("recordedAt", { ascending: false });
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as StudentViolationWithStudent[];
    },
  });
}

/** Mutation: record one violation row per selected student. */
export function useCreateViolations(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentIds: string[];
      content: string;
      recordedAt: string;
    }) => {
      const result = await createViolations({ ...input, classId });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: violationsKey(classId) });
    },
  });
}

/** Mutation: delete a recorded violation. */
export function useDeleteViolation(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (violationId: string) => {
      const result: ActionResult<void> = await deleteViolation(violationId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: violationsKey(classId) });
    },
  });
}
