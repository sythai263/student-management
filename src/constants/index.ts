/** Attendance record status values (must match DB check constraint). */
export const ATTENDANCE_STATUS = {
  PRESENT: "CO_MAT",
  ABSENT: "VANG",
  EXCUSED: "VANG_PHEP",
  SKIPPED: "BO_TIET",
  LATE: "DI_MUON",
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

/** Ordered list of statuses for pickers/buttons. */
export const ATTENDANCE_STATUS_LIST = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.ABSENT,
  ATTENDANCE_STATUS.EXCUSED,
  ATTENDANCE_STATUS.SKIPPED,
  ATTENDANCE_STATUS.LATE,
] as const;

/** Full Vietnamese labels per status. */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "Có mặt",
  VANG: "Vắng",
  VANG_PHEP: "Vắng phép",
  BO_TIET: "Bỏ tiết",
  DI_MUON: "Đi muộn",
};

/** Short labels for compact buttons (also the keyboard shortcut). */
export const ATTENDANCE_STATUS_SHORT_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "C",
  VANG: "V",
  VANG_PHEP: "P",
  BO_TIET: "B",
  DI_MUON: "M",
};

/** Badge variant per status. */
export const ATTENDANCE_STATUS_VARIANT: Record<
  AttendanceStatus,
  "default" | "secondary" | "destructive"
> = {
  CO_MAT: "default",
  VANG: "destructive",
  VANG_PHEP: "secondary",
  BO_TIET: "destructive",
  DI_MUON: "secondary",
};

/** Filter-tab labels including the "all" option. */
export const ATTENDANCE_FILTER_LABEL: Record<AttendanceStatus | "ALL", string> =
{
  ALL: "Tất cả",
  ...ATTENDANCE_STATUS_LABEL,
};

/** Seconds a student has to respond during roll-call before defaulting to VANG. */
export const ROLL_CALL_SECONDS = 10;

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

export const SCORE_TYPE_LABEL: Record<ScoreType, string> = {
  THUONG_XUYEN: "Thường xuyên",
  MIENG: "Kiểm tra miệng",
  PHUT_15: "Kiểm tra 15 phút",
  TIET_1: "Kiểm tra 1 tiết",
  GIUA_KY: "Kiểm tra giữa kỳ",
  CUOI_KY: "Kiểm tra cuối kỳ",
};
