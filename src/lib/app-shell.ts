import {
  SHELL_HIDDEN_PATTERN,
  SHELL_HIDDEN_PREFIXES,
  SHELL_HIDDEN_ROUTES,
  SHELL_MEDIUM_ROUTES,
  SHELL_NARROW_SUFFIX,
  SHELL_WIDE_PATTERN,
  SHELL_WIDE_SUFFIXES,
} from "@constants";

/** True when the route renders without the navbar shell. */
export function isShellHidden(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    SHELL_HIDDEN_ROUTES.includes(pathname) ||
    SHELL_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    SHELL_HIDDEN_PATTERN.test(pathname)
  );
}

/** Navbar lines up with the page container — width varies per route. */
export function shellContentMaxW(pathname: string | null): string {
  if (!pathname) return "max-w-5xl";
  if (
    SHELL_WIDE_SUFFIXES.some((suffix) => pathname.endsWith(suffix)) ||
    SHELL_WIDE_PATTERN.test(pathname)
  ) {
    return "max-w-7xl";
  }
  if (pathname.endsWith(SHELL_NARROW_SUFFIX)) return "max-w-2xl";
  if (SHELL_MEDIUM_ROUTES.includes(pathname)) return "max-w-4xl";
  return "max-w-5xl";
}
