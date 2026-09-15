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

/** Status colors — applied on top of the `outline` variant of Badge/Button. */
export const ATTENDANCE_STATUS_CLASS: Record<AttendanceStatus, string> = {
  CO_MAT: "border-transparent bg-green-600 text-white hover:bg-green-700",
  VANG: "border-transparent bg-red-600 text-white hover:bg-red-700",
  VANG_PHEP: "border-transparent bg-white text-zinc-900 hover:bg-zinc-100",
  BO_TIET: "border-transparent bg-orange-500 text-white hover:bg-orange-600",
  DI_MUON: "border-transparent bg-orange-200 text-orange-950 hover:bg-orange-300",
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
