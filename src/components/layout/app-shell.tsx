"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  KeyRound,
  LogOut,
  PenLine,
  School,
  ShieldCheck,
  User,
  UserPen,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "../ui/navigation-menu";
import {
  ChangePasswordDialog,
  MfaManageDialog,
  SignatureManageDialog,
  UpdateProfileDialog,
} from "../auth";
import { SchoolsManageDialog } from "../schools";
import { logout } from "@lib/actions";
import { FEATURE_FLAGS, NAV_ITEMS } from "@constants";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);

  const hideShell =
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname === "/mfa-verify" ||
    pathname?.endsWith("/race") ||
    pathname?.startsWith("/play") ||
    /\/quizzes\/host\//.test(pathname ?? "");

  if (hideShell) {
    return <>{children}</>;
  }

  // Navbar lines up with the page container — width varies per route.
  const contentMaxW =
    pathname?.endsWith("/grades") ||
      pathname?.endsWith("/report-cards") ||
      /\/attendance\/[^/]+$/.test(pathname ?? "")
      ? "max-w-7xl"
      : pathname?.endsWith("/students/new")
        ? "max-w-2xl"
        : ["/", "/classes", "/subjects", "/classes/new", "/quizzes", "/quizzes/new"].includes(
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

          <NavigationMenu viewport={false} className="ml-2">
            <NavigationMenuList className="gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      asChild
                      active={!!active}
                      className="data-active:bg-secondary"
                    >
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex-1" />

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menu tài khoản"
                >
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  <UserPen className="size-4" /> Thông tin tài khoản
                </DropdownMenuItem>
                {FEATURE_FLAGS.PASSWORD_LOGIN && (
                  <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
                    <KeyRound className="size-4" /> Đổi mật khẩu
                  </DropdownMenuItem>
                )}
                {FEATURE_FLAGS.MFA_TOTP && (
                  <DropdownMenuItem onSelect={() => setMfaOpen(true)}>
                    <ShieldCheck className="size-4" /> Xác thực 2 lớp (MFA)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setSignatureOpen(true)}>
                  <PenLine className="size-4" /> Chữ ký giáo viên
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSchoolsOpen(true)}>
                  <School className="size-4" /> Trường giảng dạy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logout}>
                  <DropdownMenuItem asChild>
                    <button type="submit">
                      <LogOut className="size-4" /> Đăng xuất
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>

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
