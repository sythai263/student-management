"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteStudent } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { compareStudentNames } from "@lib/string";
import { friendlyErrorMessage } from "@lib/utils";
import type { Student } from "@types";

interface PaginationParams {
  page: number;
  pageSize: number;
  search: string;
}

interface PaginatedResult {
  students: Student[];
  total: number;
  totalPages: number;
}

/** Fetch the student roster of a class, ordered Tên -> Họ (vi collation). */
export function useStudents(classId: string) {
  return useQuery({
    queryKey: ["students", classId],
    queryFn: async (): Promise<Student[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("classId", classId);
      if (error) throw new Error(friendlyErrorMessage(error));
      return ((data ?? []) as Student[]).sort(compareStudentNames);
    },
  });
}

/** Fetch paginated and searchable student roster of a class (backend). */
export function usePaginatedStudents(
  classId: string,
  { page, pageSize, search }: PaginationParams,
) {
  const result = useQuery({
    queryKey: ["students", classId, "paginated", page, pageSize, search],
    queryFn: async (): Promise<PaginatedResult> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("search_students", {
        p_class_id: classId,
        p_search: search,
        p_page: page,
        p_page_size: pageSize,
      });
      if (error) throw new Error(friendlyErrorMessage(error));

      const raw = (data ?? { students: [], total: 0 }) as {
        students: unknown[];
        total: number;
      };
      return {
        students: (raw.students ?? []) as Student[],
        total: raw.total ?? 0,
        totalPages: Math.max(1, Math.ceil((raw.total ?? 0) / pageSize)),
      };
    },
  });

  return {
    data: result.data ?? { students: [], total: 0, totalPages: 1 },
    isLoading: result.isLoading,
    error: result.error as Error | null,
  };
}

/** Mutation: delete a student and refresh the class roster. */
export function useDeleteStudent(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const result = await deleteStudent(studentId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", classId] });
    },
  });
}
