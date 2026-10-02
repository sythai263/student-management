import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@components/layout";
import { GameToolbar } from "@components/duck-race";

interface GamesLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

/** Shared shell for the review games (đua vịt / bắt vịt) — the header and
 *  mode switch stay mounted while the active game swaps underneath. */
export default async function GamesLayout({
  children,
  params,
}: GamesLayoutProps) {
  const { id } = await params;

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col bg-black">
      <div className="border-b border-white/10 px-2 py-2.5 sm:px-4">
        <PageHeader
          title="Kiểm tra bài cũ"
          actions={
            <Suspense>
              <GameToolbar classId={id} />
            </Suspense>
          }
        />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </main>
  );
}
