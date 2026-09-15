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
