"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import type { Student } from "@types";

/** Fetch the student roster of a class. */
export function useStudents(classId: string) {
  return useQuery({
    queryKey: ["students", classId],
    queryFn: async (): Promise<Student[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("classId", classId)
        .order("lastName")
        .order("firstName");
      if (error) throw new Error(error.message);
      return (data ?? []) as Student[];
    },
  });
}
