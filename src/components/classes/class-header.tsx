"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@components/layout";
import { useClass } from "@hooks";

interface ClassHeaderProps {
  classId: string;
}

export function ClassHeader({ classId }: ClassHeaderProps) {
  const { data: cls, isLoading, error } = useClass(classId);

  if (isLoading) {
    return (
      <PageHeader
        title={<Skeleton className="h-8 w-56" />}
        description={<Skeleton className="mt-2 h-5 w-32" />}
      />
    );
  }
  if (error || !cls) {
    return <PageHeader title="Không tìm thấy lớp" />;
  }

  return (
    <PageHeader
      title={`Lớp ${cls.name}`}
      description={`Năm học ${cls.schoolYear}`}
    />
  );
}
