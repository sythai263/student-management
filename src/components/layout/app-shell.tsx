"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, GraduationCap, LogOut } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@lib/actions";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

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
    <div className="flex min-h-screen">
      <aside
        className={`hidden flex-col border-r bg-card transition-all duration-200 md:flex ${collapsed ? "w-16" : "w-64"}`}
      >
        <div
          className={`p-4 ${collapsed ? "flex items-center justify-center" : "text-lg font-semibold"}`}
        >
          {collapsed ? (
            <span className="text-lg font-bold">SM</span>
          ) : (
            "Student Management"
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={buttonVariants({
                  variant: "ghost",
                  size: collapsed ? "icon" : "sm",
                  className: `w-full ${collapsed ? "justify-center" : "justify-start"}`,
                })}
              >
                <Icon className={collapsed ? "size-4" : "mr-2 size-4"} />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full gap-2 ${collapsed ? "justify-center" : "justify-start"}`}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" /> Thu gọn
              </>
            )}
          </Button>
          <form action={logout}>
            <Button
              variant="outline"
              type="submit"
              className="w-full gap-2"
              title="Đăng xuất"
            >
              <LogOut className="size-4" />
              {!collapsed && "Đăng xuất"}
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            aria-label="Quay lại"
          >
            <ArrowLeft /> Quay lại
          </Button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
