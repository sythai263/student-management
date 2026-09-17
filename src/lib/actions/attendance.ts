"use server";

import { revalidatePath } from "next/cache";
import { ATTENDANCE_STATUS } from "@constants";
import { renameSessionSchema, updateRecordSchema, addRecordSchema } from "@schemas";
import { deleteObject } from "@lib/storage";
import { createSupabaseAdminClient } from "@lib/supabase/admin";
import { defaultSessionName } from "@lib/attendance-session";
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

/**
 * Server Action: supplementary attendance — add a record for a student
 * who is missing from the session (e.g. joined the class after the
 * session was taken). Works on closed sessions too: RLS blocks writes
 * there, so the insert goes through the admin client — the user-scoped
 * session fetch above still proves ownership (RLS hides others' rows).
 */
export async function addAttendanceRecord(
  input: unknown,
): Promise<ActionResult<AttendanceRecord>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();

    const parsed = addRecordSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { error: sessionError } = await supabase
      .from("attendanceSessions")
      .select("id")
      .eq("id", parsed.data.sessionId)
      .single();
    if (sessionError) throw new Error("Không tìm thấy buổi điểm danh");

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("attendanceRecords")
      .insert({
        sessionId: parsed.data.sessionId,
        studentId: parsed.data.studentId,
        status: parsed.data.status,
        note: parsed.data.note ?? null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("Học sinh đã có trong buổi điểm danh này");
      }
      throw new Error(error.message);
    }
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
  clientHour?: number,
): Promise<ActionResult<{ sessionId: string }>> {
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!classId) throw new Error("Thiếu thông tin lớp học");

    const date = sessionDate ?? new Date().toISOString().slice(0, 10);
    const hour = clientHour ?? new Date().getHours();
    const { data: session, error: sessionError } = await supabase
      .from("attendanceSessions")
      .insert({
        classId,
        sessionDate: date,
        name: defaultSessionName(date, hour),
        imageKeys: [],
      })
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

/** Server Action: rename an attendance session. */
export async function renameAttendanceSession(
  input: unknown,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const { supabase } = await requireTeacher();
    const parsed = renameSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const { error } = await supabase
      .from("attendanceSessions")
      .update({ name: parsed.data.name })
      .eq("id", parsed.data.sessionId);
    if (error) throw new Error(error.message);
    return null;
  });
}

/**
 * Server Action: hard delete a session — attendanceRecords cascade in DB,
 * group photos in storage are removed alongside (best-effort).
 */
export async function deleteAttendanceSession(
  sessionId: string,
): Promise<ActionResult<null>> {
  let classId = "";
  const result = await withAction(async () => {
    const { supabase } = await requireTeacher();
    if (!sessionId) throw new Error("Thiếu thông tin buổi điểm danh");

    // RLS already guards ownership; fetch the row only to reach imageKeys.
    const { data: session, error: fetchError } = await supabase
      .from("attendanceSessions")
      .select("classId, imageKeys")
      .eq("id", sessionId)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    classId = session.classId as string;

    const imageKeys = (session.imageKeys as string[] | null) ?? [];
    await Promise.all(imageKeys.map((key) => deleteObject(key)));

    const { error } = await supabase
      .from("attendanceSessions")
      .delete()
      .eq("id", sessionId);
    if (error) throw new Error(error.message);
    return null;
  });

  if (result.success && classId) revalidatePath(`/classes/${classId}`);
  return result;
}
