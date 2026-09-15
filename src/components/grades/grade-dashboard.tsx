"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjects } from "@hooks";
import { GradeEntryGrid } from "./grade-entry-grid";

interface GradeDashboardProps {
  classId: string;
  subjectId?: string;
  subjectName?: string;
}

export function GradeDashboard({
  classId,
  subjectId: subjectIdProp,
  subjectName: subjectNameProp,
}: GradeDashboardProps) {
  const { data: subjects, isLoading } = useSubjects();
  const [subjectId, setSubjectId] = useState(subjectIdProp ?? "");
  const [semester, setSemester] = useState(1);

  const isLocked = !!subjectIdProp;
  const selectedSubject = isLocked
    ? { id: subjectIdProp, name: subjectNameProp ?? "" }
    : subjects?.find((s) => s.id === subjectId);

  const activeSubjectId = isLocked ? subjectIdProp! : subjectId;
  const activeSubjectName = selectedSubject?.name ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bảng điểm môn học</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Môn học</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : isLocked ? (
              <p
                id="subject"
                className="rounded-md border p-2 text-sm font-medium"
              >
                {activeSubjectName}
              </p>
            ) : !subjects?.length ? (
              <p className="text-sm text-destructive">Chưa có môn học.</p>
            ) : (
              <Select
                value={subjectId}
                onValueChange={(v) => setSubjectId(v ?? "")}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="semester">Học kỳ</Label>
            <Select
              value={String(semester)}
              onValueChange={(v) => setSemester(Number(v))}
            >
              <SelectTrigger id="semester">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Học kỳ 1</SelectItem>
                <SelectItem value="2">Học kỳ 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedSubject ? (
          <GradeEntryGrid
            classId={classId}
            subjectId={activeSubjectId}
            subjectName={activeSubjectName}
            semester={semester}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <BookOpen className="size-8" />
            <p>Chọn môn học và học kỳ để bắt đầu nhập điểm.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
