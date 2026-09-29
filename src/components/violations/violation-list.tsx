"use client";

import dayjs from "dayjs";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <p className="text-muted-foreground">Chưa có học sinh nào vi phạm.</p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học sinh</TableHead>
            <TableHead>Nội dung vi phạm</TableHead>
            <TableHead className="whitespace-nowrap">Thời điểm</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {violations.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {v.students ? studentFullName(v.students) : "—"}
                {v.students?.studentCode ? (
                  <span className="ml-1 text-muted-foreground">
                    ({v.students.studentCode})
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{v.content}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dayjs(v.recordedAt).format("HH:mm · DD/MM/YYYY")}
              </TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
