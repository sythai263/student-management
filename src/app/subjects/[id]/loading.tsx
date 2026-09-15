import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <header className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </header>
      <CardGridSkeleton className="lg:grid-cols-3" />
    </main>
  );
}
