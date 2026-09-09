"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGradeSessions, useSubjects } from "@hooks";
import { SCORE_TYPE_LABEL } from "@constants";

interface GradeSessionListProps {
  classId: string;
}

export function GradeSessionList({ classId }: GradeSessionListProps) {
  const { data: sessions, isLoading, error } = useGradeSessions(classId);
  const { data: subjects } = useSubjects();
  const subjectById = new Map(subjects?.map((s) => [s.id, s.name]) ?? []);

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!sessions?.length) {
    return <p className="text-muted-foreground">Chưa có đợt kiểm tra nào.</p>;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{s.name}</CardTitle>
                <CardDescription>
                  {subjectById.get(s.subjectId) ?? s.subjectId} ·{" "}
                  {SCORE_TYPE_LABEL[s.scoreType]} · Học kỳ {s.semester}
                </CardDescription>
              </div>
              <Badge variant={s.closed ? "secondary" : "default"}>
                {s.closed ? "Đã đóng" : "Đang mở"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ngày {s.date} · Hệ số {s.weight}
            </p>
            <Link
              href={`/classes/${classId}/grades/${s.id}`}
              className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}
            >
              Nhập điểm
            </Link>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
