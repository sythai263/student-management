import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import { cn } from "@lib/utils";
import { QueryProvider } from "@components/providers";
import { AppShell } from "@components/layout";
import { Toaster } from "@components/ui/sonner";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Quản lý học sinh",
  description: "Ứng dụng giúp giáo viên quản lý lớp học, điểm danh và nhập điểm",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={cn("dark", "font-sans")}>
      <body className="overflow-x-hidden">
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toaster theme="dark" richColors position="top-right" />
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
