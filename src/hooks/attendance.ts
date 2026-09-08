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

/** Fetch all records of a session, joined with student info. */
export function useAttendanceRecords(sessionId: string) {
  return useQuery({
    queryKey: ["attendance", sessionId],
    queryFn: async (): Promise<AttendanceRecordWithStudent[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("attendanceRecords")
        .select("*, students(studentCode, lastName, firstName)")
        .eq("sessionId", sessionId);
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

/** Mutation: update a single record, then refresh the board. */
export function useUpdateAttendance(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAttendanceInput) => {
      const result = await updateAttendanceRecord(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] }),
  });
}

/** Mutation: mark the whole session as present. */
export function useMarkAllPresent(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await markAllPresent(sessionId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] }),
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
