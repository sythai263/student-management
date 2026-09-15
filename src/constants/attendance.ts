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

/** Status colors (pastel) — applied on top of the `outline` variant of Badge/Button. */
export const ATTENDANCE_STATUS_CLASS: Record<AttendanceStatus, string> = {
  CO_MAT: "border-green-500/30 bg-green-500/15 text-green-400",
  VANG: "border-red-500/30 bg-red-500/15 text-red-400",
  VANG_PHEP: "border-white/20 bg-white/10 text-zinc-100",
  BO_TIET: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  DI_MUON: "border-orange-300/30 bg-orange-300/10 text-orange-300",
};

/** Hover tint for status pickers — previews the status color before selecting. */
export const ATTENDANCE_STATUS_HOVER: Record<AttendanceStatus, string> = {
  CO_MAT: "hover:border-green-500/30 hover:bg-green-500/15 hover:text-green-400",
  VANG: "hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400",
  VANG_PHEP: "hover:border-white/20 hover:bg-white/10 hover:text-zinc-100",
  BO_TIET: "hover:border-orange-500/30 hover:bg-orange-500/15 hover:text-orange-400",
  DI_MUON: "hover:border-orange-300/30 hover:bg-orange-300/10 hover:text-orange-300",
};

/** Filter-tab labels including the "all" option. */
export const ATTENDANCE_FILTER_LABEL: Record<AttendanceStatus | "ALL", string> =
{
  ALL: "Tất cả",
  ...ATTENDANCE_STATUS_LABEL,
};

/** Seconds a student has to respond during roll-call before defaulting to VANG. */
export const ROLL_CALL_SECONDS = 10;

/**
 * Feature flag: photo-based attendance via AWS Rekognition.
 * Disabled for the manual MVP — flip to true once the AWS API is verified.
 */
export const PHOTO_ATTENDANCE_ENABLED = false;
