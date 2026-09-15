/**
 * Split a free-text comment into bullet lines: each newline becomes one
 * item. Any bullet marker the teacher already typed (-, *, •, ...) is
 * stripped so the render can normalize everything to a single round-dot
 * style.
 */
export function commentBulletLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/^[\s•●◦▪·*+\-–—>‣⁃]+/u, "").trim(),
    )
    .filter(Boolean);
}
