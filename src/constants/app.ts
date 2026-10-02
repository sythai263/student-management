import { BookOpen, Gamepad2, GraduationCap } from "lucide-react";

/** Issuer label shown inside authenticator apps as "hoctap.id.vn: <email>". */
export const TOTP_ISSUER = "hoctap.id.vn";

/** Top-level nav links rendered in the app shell navbar. */
export const NAV_ITEMS = [
  { href: "/subjects", label: "Môn học", icon: BookOpen },
  { href: "/classes", label: "Lớp học", icon: GraduationCap },
  { href: "/quizzes", label: "Quiz", icon: Gamepad2 },
] as const;

/** Routes rendered bare — no navbar shell (exact matches). */
export const SHELL_HIDDEN_ROUTES: readonly string[] = [
  "/login",
  "/login/",
  "/mfa-verify",
];

/** Route prefixes rendered bare — student quiz play screens. */
export const SHELL_HIDDEN_PREFIXES: readonly string[] = ["/play"];

/** Route pattern rendered bare — quiz host fullscreen view. */
export const SHELL_HIDDEN_PATTERN = /\/quizzes\/host\//;

/** Route suffixes using the widest container (data-dense tables). */
export const SHELL_WIDE_SUFFIXES: readonly string[] = [
  "/grades",
  "/report-cards",
];

/** Route pattern using the widest container — attendance detail grid. */
export const SHELL_WIDE_PATTERN = /\/attendance\/[^/]+$/;

/** Route suffix using the narrow container (single-form pages). */
export const SHELL_NARROW_SUFFIX = "/students/new";

/** Routes using the medium container. */
export const SHELL_MEDIUM_ROUTES: readonly string[] = [
  "/",
  "/classes",
  "/subjects",
  "/classes/new",
  "/quizzes",
  "/quizzes/new",
];
