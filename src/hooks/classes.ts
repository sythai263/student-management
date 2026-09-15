"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteClass, updateClassSchool } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { Class } from "@types";

/** Fetch all classes owned by the current teacher. */
export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async (): Promise<Class[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("classes")
        .select("*, school:teacherSchools(name)")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as Class[];
    },
  });
}

/** Fetch a single class by id. */
export function useClass(classId: string) {
  return useQuery({
    queryKey: ["classes", classId],
    queryFn: async (): Promise<Class> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("classes")
        .select("*, school:teacherSchools(name)")
        .eq("id", classId)
        .single();
      if (error) throw new Error(friendlyErrorMessage(error));
      return data as Class;
    },
  });
}

/** Delete a class and invalidate the class list. */
export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

/** Mutation: re-map a class to a school (null = unmapped). */
export function useUpdateClassSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { classId: string; schoolId: string | null }) => {
      const result = await updateClassSchool(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
