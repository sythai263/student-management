"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import {
  addAttendanceRecord,
  closeAttendanceSession,
  createManualSession,
  deleteAttendanceSession,
  renameAttendanceSession,
  updateAttendanceRecord,
} from "@lib/actions";
import { localToday } from "@lib/attendance-session";
import { friendlyErrorMessage } from "@lib/utils";
import type {
  AddAttendanceInput,
  RenameSessionInput,
  UpdateAttendanceInput,
} from "@schemas";
import type { AttendanceStatus } from "@constants";
import type {
  AttendanceSession,
  AttendanceRecordWithStudent,
} from "@types";

/** Fetch a single attendance session. */
export function useAttendanceSession(sessionId: string) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<AttendanceSession> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("attendanceSessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw new Error(friendlyErrorMessage(error));
      return data as AttendanceSession;
    },
  });
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
      if (error) throw new Error(friendlyErrorMessage(error));
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
      if (error) throw new Error(friendlyErrorMessage(error));
      return (data ?? []) as AttendanceRecordWithStudent[];
    },
  });
}

// Partial key matches every status-filtered variant of the records query.
const attendanceKey = (sessionId: string) => ["attendance", sessionId];

/** Missing-counts query key — prefix-invalidate on any roster/record change. */
const missingKey = (classId: string) => ["attendance-missing", classId];

export interface MissingAttendanceCounts {
  /** Students currently on the class roster. */
  total: number;
  /** sessionId -> how many records exist in that session. */
  recorded: Record<string, number>;
}

/**
 * Per-session count of roster students WITHOUT an attendance record —
 * the "cần điểm danh bổ sung" number shown on the session list.
 * missing(sessionId) = total - recorded[sessionId].
 * Counts come pre-aggregated from the `sessionRecordCounts` view, so
 * the payload is one row per session — not one row per record.
 */
export function useMissingAttendanceCounts(classId: string) {
  return useQuery({
    queryKey: missingKey(classId),
    queryFn: async (): Promise<MissingAttendanceCounts> => {
      const supabase = createSupabaseBrowserClient();
      const [studentsRes, countsRes] = await Promise.all([
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("classId", classId),
        supabase
          .from("sessionRecordCounts")
          .select("sessionId, recordCount")
          .eq("classId", classId),
      ]);
      if (studentsRes.error) throw new Error(friendlyErrorMessage(studentsRes.error));
      if (countsRes.error) throw new Error(friendlyErrorMessage(countsRes.error));

      const recorded: Record<string, number> = {};
      for (const r of countsRes.data ?? []) {
        recorded[r.sessionId as string] = r.recordCount as number;
      }
      return { total: studentsRes.count ?? 0, recorded };
    },
  });
}

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

/**
 * Mutation: add a supplementary record for a student missing from the
 * session — works on closed sessions (admin-side insert).
 */
export function useAddAttendanceRecord(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AddAttendanceInput, "sessionId">) => {
      const result = await addAttendanceRecord({ ...input, sessionId });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: ["attendance-missing"] });
    },
  });
}

/** Mutation: close the session so no further edits are allowed. */
export function useCloseSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await closeAttendanceSession(sessionId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });
}

/** Mutation: create a manual (photo-less) attendance session. */
export function useCreateSession(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionDate?: string) => {
      const now = new Date();
      const result = await createManualSession(
        classId,
        sessionDate ?? localToday(now),
        now.getHours(),
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", classId] });
      queryClient.invalidateQueries({ queryKey: missingKey(classId) });
    },
  });
}

/** Mutation: rename a session — refreshes both list and detail caches. */
export function useRenameSession(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RenameSessionInput) => {
      const result = await renameAttendanceSession(input);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", classId] });
      queryClient.invalidateQueries({ queryKey: ["session", input.sessionId] });
    },
  });
}

/** Mutation: hard delete a session (records cascade, photos removed). */
export function useDeleteSession(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await deleteAttendanceSession(sessionId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: (_data, sessionId) => {
      queryClient.removeQueries({ queryKey: ["session", sessionId] });
      queryClient.removeQueries({ queryKey: ["attendance", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["sessions", classId] });
      queryClient.invalidateQueries({ queryKey: missingKey(classId) });
    },
  });
}
