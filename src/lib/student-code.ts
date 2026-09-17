/**
 * Sequential studentCode helper — every generated code follows the
 * "<classCode>-NNNN" convention (e.g. "B1K51-0011"). A student joining
 * mid-year gets the next number appended; codes are never renumbered
 * or recycled, so gaps left by removed students stay gaps.
 *
 * The sequence only counts codes that already use the classCode
 * prefix; other/blank codes are ignored. `taken` lets a batch skip
 * codes the file itself already claimed.
 */
export function nextStudentCode(
  existingCodes: (string | null)[],
  taken: Set<string>,
  classCode: string,
): string {
  const escaped = classCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`);
  let max = 0;
  for (const code of existingCodes) {
    const m = code?.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }

  let next: string;
  do {
    max += 1;
    next = `${classCode}-${String(max).padStart(4, "0")}`;
  } while (taken.has(next));
  taken.add(next);
  return next;
}
