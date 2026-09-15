import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  rows?: number;
  className?: string;
  itemClassName?: string;
}

/** Repeating pulse rows — pass grid classes via className for grid layouts. */
export function ListSkeleton({
  rows = 5,
  className,
  itemClassName,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-12 w-full", itemClassName)} />
      ))}
    </div>
  );
}
