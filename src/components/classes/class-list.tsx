"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClasses } from "@hooks";

export function ClassList() {
  const { data: classes, isLoading, error } = useClasses();

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!classes?.length) {
    return <p className="text-muted-foreground">Chưa có lớp nào.</p>;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {classes.map((c) => (
        <Link key={c.id} href={`/classes/${c.id}`}>
          <Card className="transition-colors hover:border-primary">
            <CardHeader>
              <CardTitle>{c.name}</CardTitle>
              <CardDescription>Năm học {c.schoolYear}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </section>
  );
}
