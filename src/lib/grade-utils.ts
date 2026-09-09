import { GRADE_SLOT_WEIGHT, type GradeSlot } from "@constants";

const SLOTS: GradeSlot[] = ["tx1", "tx2", "tx3", "tx4", "gk", "ck"];

/**
 * Calculate the weighted average for a grade row.
 * Returns null when no scores are present.
 */
export function calculateAverage(
  scores: Partial<Record<GradeSlot, number | null | undefined>>,
): number | null {
  let total = 0;
  let weight = 0;
  for (const slot of SLOTS) {
    const score = scores[slot];
    if (score != null) {
      total += score * GRADE_SLOT_WEIGHT[slot];
      weight += GRADE_SLOT_WEIGHT[slot];
    }
  }
  if (weight === 0) return null;
  return Math.round((total / weight) * 100) / 100;
}
