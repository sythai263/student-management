import { ATTENDANCE_STATUS } from "@constants";
import { createSupabaseServerClient } from "@lib/supabase";
import { createSupabaseAdminClient } from "@lib/supabase/admin";
import { friendlyErrorMessage } from "@lib/utils";

/**
 * Standardized return type for every Server Action.
 * Actions THROW errors internally; `withAction` catches them once
 * at the controller boundary and normalizes into this shape.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Auth guard for server actions: returns the Supabase client bound to
 * the current teacher's session. Throws if not logged in.
 * Uses getClaims() — verifies the JWT locally via JWKS instead of a
 * network round-trip to the Auth server on every action call.
 */
export async function requireTeacher() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) throw new Error("Bạn chưa đăng nhập");
  return { supabase, user: { id: claims.sub, email: claims.email } };
}

/**
 * Controller boundary: runs an action body, converts any thrown error
 * into a normalized ActionResult. Keeps action bodies free of
 * repetitive try/catch + { success: false } boilerplate.
 */
export async function withAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (err) {
    return {
      success: false,
      error: friendlyErrorMessage(err),
    };
  }
}

/**
 * Insert VANG records for the given students into EVERY attendance
 * session of the class — including closed ones, so this goes through
 * the admin client (RLS blocks writes to closed sessions). Callers
 * must already have verified the teacher owns the class.
 */
export async function addStudentsToAllSessions(
  classId: string,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;
  const admin = createSupabaseAdminClient();

  const { data: sessions, error: sessionsError } = await admin
    .from("attendanceSessions")
    .select("id")
    .eq("classId", classId);
  if (sessionsError) throw new Error(sessionsError.message);

  const rows = (sessions ?? []).flatMap((s) =>
    studentIds.map((studentId) => ({
      sessionId: s.id as string,
      studentId,
      status: ATTENDANCE_STATUS.ABSENT,
    })),
  );
  if (rows.length === 0) return;

  const { error } = await admin.from("attendanceRecords").upsert(rows, {
    onConflict: '"sessionId","studentId"',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
}
