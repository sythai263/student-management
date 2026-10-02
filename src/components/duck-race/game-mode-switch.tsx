"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bird, Dices } from "lucide-react";

const MODES = [
  { key: "race", label: "Đua vịt", icon: Dices, path: "race" },
  { key: "catch", label: "Bắt vịt", icon: Bird, path: "catch" },
] as const;

/** Segmented switch between the review games; reads the active mode from
 *  the URL so it can live in the shared (games) layout. */
export function GameModeSwitch({ classId }: { classId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subjectId");
  const query = subjectId ? `?subjectId=${subjectId}` : "";
  const mode = pathname.includes("/catch") ? "catch" : "race";

  return (
    <div className="flex overflow-hidden rounded-md border border-white/20">
      {MODES.map((m) => {
        const active = m.key === mode;
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            replace
            href={`/classes/${classId}/${m.path}${query}`}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${active
              ? "bg-white/15 font-medium text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{m.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
