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
  CO_MAT: "border-success/30 bg-success/15 text-success",
  VANG: "border-destructive/30 bg-destructive/15 text-destructive",
  VANG_PHEP: "border-foreground/20 bg-foreground/10 text-foreground",
  BO_TIET: "border-warning/40 bg-warning/15 text-warning",
  DI_MUON: "border-warning/30 bg-warning/10 text-warning/80",
};

/** Hover previews the status color — solid fill + contrasting text.
 *  `enabled:` raises specificity to beat the outline variant's
 *  `dark:border-input`/`dark:bg-input/30`; `bg` also needs `dark:` to beat
 *  `dark:hover:bg-input/50`. */
export const ATTENDANCE_STATUS_HOVER: Record<AttendanceStatus, string> = {
  CO_MAT:
    "enabled:hover:border-success enabled:hover:bg-success enabled:hover:text-white dark:enabled:hover:bg-success",
  VANG: "enabled:hover:border-destructive enabled:hover:bg-destructive enabled:hover:text-white dark:enabled:hover:bg-destructive",
  VANG_PHEP:
    "enabled:hover:border-foreground enabled:hover:bg-foreground enabled:hover:text-background dark:enabled:hover:bg-foreground",
  BO_TIET:
    "enabled:hover:border-warning enabled:hover:bg-warning enabled:hover:text-warning-foreground dark:enabled:hover:bg-warning",
  DI_MUON:
    "enabled:hover:border-warning enabled:hover:bg-warning enabled:hover:text-warning-foreground dark:enabled:hover:bg-warning",
};

/** Filter-tab labels including the "all" option. */
export const ATTENDANCE_FILTER_LABEL: Record<AttendanceStatus | "ALL", string> =
{
  ALL: "Tất cả",
  ...ATTENDANCE_STATUS_LABEL,
};

/** Part-of-day shift labels used in the auto session name. */
export const SESSION_SHIFT = {
  MORNING: "Sáng",
  AFTERNOON: "Chiều",
} as const;

export type SessionShift = (typeof SESSION_SHIFT)[keyof typeof SESSION_SHIFT];

/** Hour boundary: created before this hour => Sáng, otherwise => Chiều. */
export const SESSION_SHIFT_NOON_HOUR = 12;

/** Seconds a student has to respond during roll-call before defaulting to VANG. */
export const ROLL_CALL_SECONDS = 10;
