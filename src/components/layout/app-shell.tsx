"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  KeyRound,
  LogOut,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChangePasswordDialog } from "@components/auth";
import { logout } from "@lib/actions";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
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
    pathname?.endsWith("/race");

  if (hideShell) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/", label: "Môn học", icon: BookOpen },
    { href: "/classes", label: "Lớp học", icon: GraduationCap },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Quay lại"
        >
          <ArrowLeft />
        </Button>

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
                  setPasswordOpen(true);
                }}
              >
                <KeyRound className="size-4" /> Đổi mật khẩu
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
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
