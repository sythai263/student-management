"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/list-skeleton";
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
          <p className="text-sm text-muted-foreground">
            Bạn chưa có môn học nào. Hãy thêm ở trang Môn học.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((s) => {
              const checked = assignedBySubjectId.has(s.id);
              return (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(s.id, e.target.checked)}
                    disabled={isBusy}
                    className="size-4"
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
