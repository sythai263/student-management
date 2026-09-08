"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@lib/supabase";
import {
  createManualSession,
  markAllPresent,
  updateAttendanceRecord,
} from "@lib/actions";
import type { AttendanceStatus } from "@constants";
import type { AttendanceSession, AttendanceRecord, Student } from "@types";

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  students: Pick<Student, "studentCode" | "lastName" | "firstName"> | null;
}

/** List attendance sessions of a class, newest first. */
export function useAttendanceSessions(classId: string) {
  return useQuery({
    queryKey: ["sessions", classId],
    queryFn: async (): Promise<AttendanceSession[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("attendanceSessions")
        .select("*")
        .eq("classId", classId)
        .order("sessionDate", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AttendanceSession[];
    },
  });
}

/**
 * Fetch records of a session, joined with student info.
 * Status filter is applied server-side (.eq) — pass "ALL" for everything.
 */
export function useAttendanceRecords(
  sessionId: string,
  status: AttendanceStatus | "ALL" = "ALL",
) {
  return useQuery({
    queryKey: ["attendance", sessionId, status],
    queryFn: async (): Promise<AttendanceRecordWithStudent[]> => {
      const supabase = createSupabaseBrowserClient();
      let query = supabase
        .from("attendanceRecords")
        .select("*, students(studentCode, lastName, firstName)")
        .eq("sessionId", sessionId);
      if (status !== "ALL") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as AttendanceRecordWithStudent[];
    },
  });
}

interface UpdateAttendanceInput {
  recordId: string;
  status: AttendanceStatus;
  note?: string;
}

// Partial key matches every status-filtered variant of the records query.
const attendanceKey = (sessionId: string) => ["attendance", sessionId];

/** Mutation: update a single record — optimistic cache update, no refetch. */
export function useUpdateAttendance(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAttendanceInput) => {
      const result = await updateAttendanceRecord(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey(sessionId) });
      const previous = queryClient.getQueriesData<AttendanceRecordWithStudent[]>(
        { queryKey: attendanceKey(sessionId) },
      );
      queryClient.setQueriesData<AttendanceRecordWithStudent[]>(
        { queryKey: attendanceKey(sessionId) },
        (old) =>
          old?.map((r) =>
            r.id === input.recordId
              ? { ...r, status: input.status, note: input.note ?? null }
              : r,
          ),
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      context?.previous?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
  });
}

/** Mutation: mark the whole session as present — optimistic, no refetch. */
export function useMarkAllPresent(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await markAllPresent(sessionId);
      if (!result.success) throw new Error(result.error);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: attendanceKey(sessionId) });
      const previous = queryClient.getQueriesData<AttendanceRecordWithStudent[]>(
        { queryKey: attendanceKey(sessionId) },
      );
      queryClient.setQueriesData<AttendanceRecordWithStudent[]>(
        { queryKey: attendanceKey(sessionId) },
        (old) => old?.map((r) => ({ ...r, status: "CO_MAT" as const })),
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      context?.previous?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
  });
}

/** Mutation: create a manual (photo-less) attendance session. */
export function useCreateSession(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionDate?: string) => {
      const result = await createManualSession(classId, sessionDate);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["sessions", classId] }),
  });
}
