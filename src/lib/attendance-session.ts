import {
  SESSION_SHIFT,
  SESSION_SHIFT_NOON_HOUR,
} from "@constants";

/**
 * Default name for a new attendance session, e.g. "15/09/2026 - Sáng".
 * `sessionDate` is an ISO date ("yyyy-mm-dd"); the shift is derived from
 * the creation time — before noon => Sáng, from noon on => Chiều.
 */
export function defaultSessionName(
  sessionDate: string,
  now: Date = new Date(),
): string {
  const [y, m, d] = sessionDate.split("-").map(Number);
  const shift =
    now.getHours() < SESSION_SHIFT_NOON_HOUR
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
