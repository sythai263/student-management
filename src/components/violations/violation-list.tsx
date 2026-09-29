"use client";

import dayjs from "dayjs";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useDeleteViolation, useViolations } from "@hooks";
import { studentFullName } from "@lib/string";

interface ViolationListProps {
  classId: string;
}

export function ViolationList({ classId }: ViolationListProps) {
  const { data: violations, isLoading, error } = useViolations(classId);
  const deleteMutation = useDeleteViolation(classId);

  if (isLoading) return <ListSkeleton />;
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!violations?.length) {
    return (
      <p className="text-muted-foreground">
        Chưa có học sinh nào vi phạm.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {violations.map((v) => (
        <li
          key={v.id}
          className="flex items-start justify-between gap-3 px-4 py-3"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {v.students ? studentFullName(v.students) : "—"}
              {v.students?.studentCode ? (
                <span className="ml-1 text-muted-foreground">
                  ({v.students.studentCode})
                </span>
              ) : null}
            </p>
            <p className="text-sm">{v.content}</p>
            <p className="text-xs text-muted-foreground">
              {dayjs(v.recordedAt).format("HH:mm · DD/MM/YYYY")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Xóa vi phạm"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(v.id, {
                onSuccess: () => toast.success("Đã xóa vi phạm"),
                onError: (err) => toast.error(err.message),
              })
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
