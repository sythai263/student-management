import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <header className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-32" />
      </header>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <ListSkeleton
            rows={6}
            className="grid gap-2 space-y-0 sm:grid-cols-2"
            itemClassName="h-9"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="hidden sm:block">
        <TableSkeleton columns={6} rows={10} />
      </div>
      <ListSkeleton rows={8} className="sm:hidden" itemClassName="h-[3.75rem]" />
    </main>
  );
}
