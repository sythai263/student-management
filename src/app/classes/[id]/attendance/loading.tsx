import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/ui/list-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-6 w-32" />
      <ListSkeleton rows={4} />
    </main>
  );
}
