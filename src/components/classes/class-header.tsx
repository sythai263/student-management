"use client";

import { useClass } from "@hooks";

interface ClassHeaderProps {
  classId: string;
}

export function ClassHeader({ classId }: ClassHeaderProps) {
  const { data: cls, isLoading, error } = useClass(classId);

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
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
