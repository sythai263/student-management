import { BookOpen, Gamepad2, GraduationCap } from "lucide-react";

/** Issuer label shown inside authenticator apps as "hoctap.id.vn: <email>". */
export const TOTP_ISSUER = "hoctap.id.vn";

/** Top-level nav links rendered in the app shell navbar. */
export const NAV_ITEMS = [
  { href: "/", label: "Môn học", icon: BookOpen },
  { href: "/classes", label: "Lớp học", icon: GraduationCap },
  { href: "/quizzes", label: "Quiz", icon: Gamepad2 },
] as const;
