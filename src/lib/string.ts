export function removeDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Normalize a school name that may contain intentional line breaks.
 * Each line is trimmed and its inner whitespace collapsed. With
 * `keepLineBreaks` the breaks are preserved ("\n"); otherwise lines
 * are joined with a single space.
 */
export function normalizeSchoolName(
  name: string,
  options?: { keepLineBreaks?: boolean },
): string {
  const lines = name
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  return options?.keepLineBreaks ? lines.join("\n") : lines.join(" ");
}

/**
 * Vietnamese roster order: Tên (firstName) first, then Họ đệm
 * (lastName), using the "vi" collation so diacritics sort properly.
 */
export function compareStudentNames(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string },
): number {
  return (
    a.firstName.localeCompare(b.firstName, "vi") ||
    a.lastName.localeCompare(b.lastName, "vi")
  );
}
