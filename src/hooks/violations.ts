"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import {
  createViolations,
  deleteViolation,
  type ActionResult,
} from "@lib/actions";
import { friendlyErrorMessage } from "@lib/utils";
import type { StudentViolationWithStudent } from "@types";

const violationsKey = (classId: string) => ["violations", classId] as const;

interface ViolationFilterParams {
  page: number;
  pageSize: number;
  /** Filter by a single student; empty = all students. */
  studentId?: string;
  /** Local calendar day (yyyy-mm-dd) — matches recordedAt on that day. */
  date?: string;
}

interface PaginatedViolations {
  violations: StudentViolationWithStudent[];
  total: number;
  totalPages: number;
}

/** Fetch paginated violation records of a class (server-side filter). */
export function usePaginatedViolations(
  classId: string,
  { page, pageSize, studentId, date }: ViolationFilterParams,
) {
  const result = useQuery({
    queryKey: [
      ...violationsKey(classId),
      { page, pageSize, studentId, date },
    ],
    queryFn: async (): Promise<PaginatedViolations> => {
      const supabase = createSupabaseBrowserClient();
      let query = supabase
        .from("studentViolations")
        .select("*, students(studentCode, lastName, firstName, nameSuffix)", {
          count: "exact",
        })
        .eq("classId", classId)
        .order("recordedAt", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (studentId) query = query.eq("studentId", studentId);
      if (date) {
        // recordedAt is timestamptz — bound the local calendar day.
        query = query
          .gte("recordedAt", dayjs(date).startOf("day").toISOString())
          .lte("recordedAt", dayjs(date).endOf("day").toISOString());
      }

      const { data, count, error } = await query;
      if (error) throw new Error(friendlyErrorMessage(error));
      const total = count ?? 0;
      return {
        violations: (data ?? []) as StudentViolationWithStudent[],
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },
  });

  return {
    data: result.data ?? { violations: [], total: 0, totalPages: 1 },
    isLoading: result.isLoading,
    error: result.error as Error | null,
  };
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
