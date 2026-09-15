"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  BookOpen,
  GraduationCap,
  KeyRound,
  LogOut,
  PenLine,
  School,
  ShieldCheck,
  User,
  UserPen,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ChangePasswordDialog,
  MfaManageDialog,
  SignatureManageDialog,
  UpdateProfileDialog,
} from "@components/auth";
import { SchoolsManageDialog } from "@components/schools";
import { logout } from "@lib/actions";
import { FEATURE_FLAGS } from "@constants";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuOpen]);

  const hideShell =
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname === "/mfa-verify" ||
    pathname?.endsWith("/race");

  if (hideShell) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/", label: "Môn học", icon: BookOpen },
    { href: "/classes", label: "Lớp học", icon: GraduationCap },
  ];

  // Navbar lines up with the page container — width varies per route.
  const contentMaxW =
    pathname?.endsWith("/grades") ||
      pathname?.endsWith("/report-cards") ||
      /\/attendance\/[^/]+$/.test(pathname ?? "")
      ? "max-w-7xl"
      : pathname?.endsWith("/students/new")
        ? "max-w-2xl"
        : ["/", "/classes", "/subjects", "/classes/new"].includes(
          pathname ?? "",
        )
          ? "max-w-4xl"
          : "max-w-5xl";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background print:hidden">
        <div
          className={cn(
            "mx-auto flex h-14 w-full items-center gap-2 px-4 sm:px-8",
            contentMaxW,
          )}
        >
          <Link href="/" className="text-sm font-semibold sm:text-base">
            Quản lý học sinh
          </Link>

          <nav className="ml-2 flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={buttonVariants({
                    variant: active ? "secondary" : "ghost",
                    size: "sm",
                  })}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu tài khoản"
            >
              <User className="size-5" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border bg-popover p-1 shadow-md">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    setProfileOpen(true);
                  }}
                >
                  <UserPen className="size-4" /> Thông tin tài khoản
                </button>
                {FEATURE_FLAGS.PASSWORD_LOGIN && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      setPasswordOpen(true);
                    }}
                  >
                    <KeyRound className="size-4" /> Đổi mật khẩu
                  </button>
                )}
                {FEATURE_FLAGS.MFA_TOTP && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      setMfaOpen(true);
                    }}
                  >
                    <ShieldCheck className="size-4" /> Xác thực 2 lớp (MFA)
                  </button>
                )}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    setSignatureOpen(true);
                  }}
                >
                  <PenLine className="size-4" /> Chữ ký giáo viên
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    setSchoolsOpen(true);
                  }}
                >
                  <School className="size-4" /> Trường giảng dạy
                </button>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <LogOut className="size-4" /> Đăng xuất
                  </button>
                </form>
              </div>
            )}

            <ChangePasswordDialog
              open={passwordOpen}
              onOpenChange={setPasswordOpen}
            />
            <UpdateProfileDialog
              open={profileOpen}
              onOpenChange={setProfileOpen}
            />
            <MfaManageDialog open={mfaOpen} onOpenChange={setMfaOpen} />
            <SignatureManageDialog
              open={signatureOpen}
              onOpenChange={setSignatureOpen}
            />
            <SchoolsManageDialog
              open={schoolsOpen}
              onOpenChange={setSchoolsOpen}
            />
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
