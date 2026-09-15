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

/** Rekognition similarity threshold for SearchFacesByImage (0-100). */
export const FACE_MATCH_THRESHOLD = 70;

/** Rekognition rejects Bytes payloads over 5MB — keep a safety margin. */
export const REKOGNITION_IMAGE_MAX_BYTES = 4.5 * 1024 * 1024;

/** Fixed grade slots per subject/semester. */
export const GRADE_SLOTS = ["tx1", "tx2", "tx3", "tx4", "gk", "ck"] as const;

export type GradeSlot = (typeof GRADE_SLOTS)[number];

export const GRADE_SLOT_LABEL: Record<GradeSlot, string> = {
  tx1: "TX1",
  tx2: "TX2",
  tx3: "TX3",
  tx4: "TX4",
  gk: "GK",
  ck: "CK",
};

export const GRADE_SLOT_FULL_LABEL: Record<GradeSlot, string> = {
  tx1: "Điểm thường xuyên 1",
  tx2: "Điểm thường xuyên 2",
  tx3: "Điểm thường xuyên 3",
  tx4: "Điểm thường xuyên 4",
  gk: "Điểm giữa kỳ",
  ck: "Điểm cuối kỳ",
};

export const GRADE_SLOT_WEIGHT: Record<GradeSlot, number> = {
  tx1: 1,
  tx2: 1,
  tx3: 1,
  tx4: 1,
  gk: 2,
  ck: 3,
};

export * from "./duck-race";
