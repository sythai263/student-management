import {
  SESSION_SHIFT,
  SESSION_SHIFT_NOON_HOUR,
} from "@constants";

/**
 * Local "today" as an ISO date ("yyyy-mm-dd") in the caller's timezone.
 * `Date#toISOString` is UTC, which shifts the date near midnight — use
 * this whenever the client hands a date to the server.
 */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Default name for a new attendance session, e.g. "15/09/2026 - Sáng".
 * `sessionDate` is an ISO date ("yyyy-mm-dd"). `localHour` must be the
 * creation hour in the teacher's timezone (`new Date().getHours()` sent
 * from the client) — the server clock does not reflect the teacher's
 * morning/afternoon.
 */
export function defaultSessionName(
  sessionDate: string,
  localHour: number,
): string {
  const [y, m, d] = sessionDate.split("-").map(Number);
  const shift =
    localHour < SESSION_SHIFT_NOON_HOUR
      ? SESSION_SHIFT.MORNING
      : SESSION_SHIFT.AFTERNOON;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d)}/${pad(m)}/${y} - ${shift}`;
}

/** Display name with fallback for legacy rows created before the name column. */
export function sessionDisplayName(session: {
  name?: string | null;
  sessionDate: string;
}): string {
  return session.name ?? session.sessionDate;
}
