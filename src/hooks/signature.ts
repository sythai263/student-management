"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSignature, saveSignature } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { friendlyErrorMessage } from "@lib/utils";
import type { TeacherSignature } from "@types";

const SIGNATURE_KEY = ["teacher-signature"];

/** Fetch the current teacher's saved signature, if any. */
export function useTeacherSignature() {
  return useQuery({
    queryKey: SIGNATURE_KEY,
    queryFn: async (): Promise<TeacherSignature | null> => {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("teacherSignatures")
        .select("*")
        .eq("teacherId", userData.user.id)
        .maybeSingle();
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data as TeacherSignature) ?? null;
    },
  });
}

/** Mutation: save (create/replace) the teacher's signature. */
export function useSaveSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageKey: string) => {
      const result = await saveSignature(imageKey);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SIGNATURE_KEY });
    },
  });
}

/** Mutation: delete the teacher's saved signature. */
export function useDeleteSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await deleteSignature();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SIGNATURE_KEY });
    },
  });
}
