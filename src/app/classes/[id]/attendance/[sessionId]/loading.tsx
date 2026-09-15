import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceBoardSkeleton } from "@components/attendance";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <Skeleton className="h-8 w-48" />
      <AttendanceBoardSkeleton />
    </main>
  );
}
