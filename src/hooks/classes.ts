"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@lib/supabase";
import type { Class } from "@types";

/** Fetch all classes owned by the current teacher. */
export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async (): Promise<Class[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
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
        .select("*")
        .eq("id", classId)
        .single();
      if (error) throw new Error(error.message);
      return data as Class;
    },
  });
}
