import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 p-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full max-w-3xl rounded-xl" />
      <Skeleton className="h-9 w-28" />
    </main>
  );
}
