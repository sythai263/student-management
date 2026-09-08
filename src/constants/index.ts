/** Attendance record status values (must match DB check constraint). */
export const ATTENDANCE_STATUS = {
  PRESENT: "CO_MAT",
  ABSENT: "VANG",
  EXCUSED: "VANG_PHEP",
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

/** Grade score types (must match DB check constraint). */
export const SCORE_TYPES = [
  "THUONG_XUYEN",
  "MIENG",
  "PHUT_15",
  "TIET_1",
  "GIUA_KY",
  "CUOI_KY",
] as const;

export type ScoreType = (typeof SCORE_TYPES)[number];
