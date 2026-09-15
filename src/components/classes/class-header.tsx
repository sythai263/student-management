"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useClass } from "@hooks";

interface ClassHeaderProps {
  classId: string;
}

export function ClassHeader({ classId }: ClassHeaderProps) {
  const { data: cls, isLoading, error } = useClass(classId);

  if (isLoading) {
    return (
      <header className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-32" />
      </header>
    );
  }
  if (error || !cls) {
    return <p className="text-sm text-destructive">Không tìm thấy lớp</p>;
  }

  return (
    <header>
      <h1 className="text-2xl font-semibold">Lớp {cls.name}</h1>
      <p className="text-muted-foreground">Năm học {cls.schoolYear}</p>
    </header>
  );
}
