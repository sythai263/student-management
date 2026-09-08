/** Attendance record status values (must match DB check constraint). */
export const ATTENDANCE_STATUS = {
  PRESENT: "CO_MAT",
  ABSENT: "VANG",
  EXCUSED: "VANG_PHEP",
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

/** Ordered list of statuses for pickers/buttons. */
export const ATTENDANCE_STATUS_LIST = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.ABSENT,
  ATTENDANCE_STATUS.EXCUSED,
] as const;

/** Full Vietnamese labels per status. */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "Có mặt",
  VANG: "Vắng",
  VANG_PHEP: "Vắng phép",
};

/** Short labels for compact buttons (also the keyboard shortcut). */
export const ATTENDANCE_STATUS_SHORT_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "C",
  VANG: "V",
  VANG_PHEP: "P",
};

/** Badge variant per status. */
export const ATTENDANCE_STATUS_VARIANT: Record<
  AttendanceStatus,
  "default" | "secondary" | "destructive"
> = {
  CO_MAT: "default",
  VANG: "destructive",
  VANG_PHEP: "secondary",
};

/** Filter-tab labels including the "all" option. */
export const ATTENDANCE_FILTER_LABEL: Record<AttendanceStatus | "ALL", string> =
{
  ALL: "Tất cả",
  ...ATTENDANCE_STATUS_LABEL,
};

/** Seconds a student has to respond during roll-call before defaulting to VANG. */
export const ROLL_CALL_SECONDS = 6;

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
