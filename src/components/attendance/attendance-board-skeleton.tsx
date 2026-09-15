import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** Placeholder matching AttendanceToolbar + AttendanceGrid while the session loads. */
export function AttendanceBoardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full" />
      <ListSkeleton
        rows={12}
        className="grid grid-cols-2 gap-2 space-y-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        itemClassName="h-[4.25rem]"
      />
    </div>
  );
}
