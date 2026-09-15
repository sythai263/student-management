"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned content (buttons, forms). */
  actions?: ReactNode;
}

/** Page title row — the back button appears beside the title on drilled-in pages. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const depth = pathname?.split("/").filter(Boolean).length ?? 0;

  return (
    <header className="flex items-center gap-3 print:hidden">
      {depth >= 2 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Quay lại"
          className="-ml-2 shrink-0"
        >
          <ArrowLeft />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <div className="text-muted-foreground">{description}</div>
        )}
      </div>
      {actions}
    </header>
  );
}
