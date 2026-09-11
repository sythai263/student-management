"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSubject, deleteSubject } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import type { Subject, SubjectCatalog } from "@types";
import type { CreateSubjectInput } from "@schemas";

/** Fetch the global subject catalog. */
export function useSubjectCatalog() {
  return useQuery({
    queryKey: ["subjectCatalog"],
    queryFn: async (): Promise<SubjectCatalog[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("subjectCatalog")
        .select("*")
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as SubjectCatalog[];
    },
  });
}

/** Fetch all subjects owned by the current teacher. */
export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Subject[];
    },
  });
}

/** Mutation: create a subject and refresh the subject list. */
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      const result = await createSubject(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

/** Mutation: delete a subject and refresh the subject list. */
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSubject(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
