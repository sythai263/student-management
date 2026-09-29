"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { buttonVariants } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { ListSkeleton } from "../ui/list-skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "../ui/empty";
import {
  useSubjects,
  useClassSubjects,
  useAssignClassSubject,
  useRemoveClassSubject,
} from "@hooks";

interface ClassSubjectManagerProps {
  classId: string;
}

export function ClassSubjectManager({ classId }: ClassSubjectManagerProps) {
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: classSubjects, isLoading: classSubjectsLoading } =
    useClassSubjects(classId);
  const assign = useAssignClassSubject(classId);
  const remove = useRemoveClassSubject(classId);

  const isBusy = assign.isPending || remove.isPending;

  const assignedBySubjectId = new Map(
    classSubjects?.map((c) => [c.subjectId, c.id]),
  );

  function toggle(subjectId: string, checked: boolean) {
    if (checked) {
      assign.mutate({ classId, subjectId });
    } else {
      const classSubjectId = assignedBySubjectId.get(subjectId);
      if (classSubjectId) {
        remove.mutate(classSubjectId);
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Môn học của lớp</CardTitle>
        <Link
          href="/subjects"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Quản lý môn
        </Link>
      </CardHeader>
      <CardContent>
        {subjectsLoading || classSubjectsLoading ? (
          <ListSkeleton
            rows={6}
            className="grid gap-2 space-y-0 sm:grid-cols-2"
            itemClassName="h-9"
          />
        ) : !subjects?.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>Bạn chưa có môn học nào.</EmptyTitle>
              <EmptyDescription>
                Hãy thêm môn học ở trang Môn học trước.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((s) => {
              const checked = assignedBySubjectId.has(s.id);
              return (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => toggle(s.id, v)}
                    disabled={isBusy}
                  />
                  <span className="text-sm">
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
