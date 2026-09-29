"use client";

import dayjs from "dayjs";
import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";
import { ListSkeleton } from "../ui/list-skeleton";
import { useDeleteViolation, useViolations } from "@hooks";
import { studentFullName } from "@lib/string";
import type { StudentViolationWithStudent } from "@types";
import { DataTable } from "../data-table";

function violationColumns(
  isPending: boolean,
  onDelete: (id: string) => void,
): ColumnDef<StudentViolationWithStudent>[] {
  return [
    {
      id: "student",
      header: "Học sinh",
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.students ? studentFullName(row.original.students) : "—"}
          {row.original.students?.studentCode ? (
            <span className="ml-1 text-muted-foreground">
              ({row.original.students.studentCode})
            </span>
          ) : null}
        </span>
      ),
    },
    { accessorKey: "content", header: "Nội dung vi phạm" },
    {
      accessorKey: "recordedAt",
      header: "Thời điểm",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {dayjs(getValue<string>()).format("HH:mm · DD/MM/YYYY")}
        </span>
      ),
      meta: { headerClassName: "whitespace-nowrap" },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Xóa vi phạm"
          disabled={isPending}
          onClick={() => onDelete(row.original.id)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ),
      meta: { headerClassName: "w-10" },
    },
  ];
}

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

  return (
    <DataTable
      columns={violationColumns(deleteMutation.isPending, (id) =>
        deleteMutation.mutate(id, {
          onSuccess: () => toast.success("Đã xóa vi phạm"),
          onError: (err) => toast.error(err.message),
        }),
      )}
      data={violations ?? []}
      emptyIcon={<ShieldAlert />}
      emptyTitle="Chưa có học sinh nào vi phạm."
      emptyDescription="Ghi nhận vi phạm qua nút Ghi nhận vi phạm phía trên."
    />
  );
}
