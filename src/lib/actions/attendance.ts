"use server";

import { revalidatePath } from "next/cache";
import { ATTENDANCE_STATUS } from "@constants";
import { updateRecordSchema } from "@schemas";
import type { AttendanceRecord } from "@types";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

/** Server Action: update one attendance record's status/note. */
export async function updateAttendanceRecord(
  input: unknown,
): Promise<ActionResult<AttendanceRecord>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = updateRecordSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("attendanceRecords")
      .update({ status: parsed.data.status, note: parsed.data.note ?? null })
      .eq("id", parsed.data.recordId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as AttendanceRecord;
  });
}

/** Server Action: close a session so its records can no longer be edited. */
export async function closeAttendanceSession(
  sessionId: string,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    const { error } = await supabase
      .from("attendanceSessions")
      .update({ closed: true })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);
    return null;
  });
}

/**
 * Server Action: manual attendance — create an empty session (no photos)
 * and pre-fill VANG records for the whole roster so the teacher can
 * tick attendance by hand.
 */
export async function createManualSession(
  classId: string,
  sessionDate?: string,
): Promise<ActionResult<{ sessionId: string }>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!classId) throw new Error("Thiếu thông tin lớp học");

    const date = sessionDate ?? new Date().toISOString().slice(0, 10);
    const { data: session, error: sessionError } = await supabase
      .from("attendanceSessions")
      .insert({ classId, sessionDate: date, imageKeys: [] })
      .select("id")
      .single();
    if (sessionError) throw new Error(sessionError.message);

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .eq("classId", classId);
    if (studentsError) throw new Error(studentsError.message);

    if (students && students.length > 0) {
      const { error: recordsError } = await supabase
        .from("attendanceRecords")
        .insert(
          students.map((s) => ({
            sessionId: session.id,
            studentId: s.id as string,
            status: ATTENDANCE_STATUS.ABSENT,
          })),
        );
      if (recordsError) throw new Error(recordsError.message);
    }

    return { sessionId: session.id as string };
  });

  if (result.success) revalidatePath(`/classes/${classId}`);
  return result;
}
