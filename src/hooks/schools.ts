"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSchool, deleteSchool, renameSchool } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { TeacherSchool } from "@types";

const SCHOOLS_KEY = ["schools"];

/** Fetch all schools the current teacher teaches at. */
export function useSchools() {
  return useQuery({
    queryKey: SCHOOLS_KEY,
    queryFn: async (): Promise<TeacherSchool[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("teacherSchools")
        .select("*")
        .order("name");
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as TeacherSchool[];
    },
  });
}

/** Mutation: add a school and refresh the school list. */
export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await createSchool({ name });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
    },
  });
}

/** Mutation: rename a school and refresh lists that show its name. */
export function useRenameSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const result = await renameSchool(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

/** Mutation: delete a school (classes mapped to it are unmapped). */
export function useDeleteSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSchool(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
