"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Pagination } from "../ui/pagination";
import { TableSkeleton } from "../ui/table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useDeleteViolation, usePaginatedViolations } from "@hooks";
import { studentFullName } from "@lib/string";
import type { StudentViolationWithStudent } from "@types";
import { DataTable } from "../data-table";
import { ViolationFilters } from "./violation-filters";
import { ViolationDetailDialog } from "./violation-detail-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

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
          onClick={(e) => {
            // Keep the row's detail-dialog handler from firing.
            e.stopPropagation();
            onDelete(row.original.id);
          }}
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState("");
  const [viewing, setViewing] =
    useState<StudentViolationWithStudent | null>(null);
  const {
    data: { violations, total, totalPages },
    isLoading,
    error,
  } = usePaginatedViolations(classId, {
    page,
    pageSize,
    studentId: studentId || undefined,
    date: date || undefined,
  });
  const deleteMutation = useDeleteViolation(classId);

  const onFilterChange = (next: { studentId?: string; date?: string }) => {
    if (next.studentId !== undefined) setStudentId(next.studentId);
    if (next.date !== undefined) setDate(next.date);
    setPage(1);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-medium">Danh sách vi phạm ({total})</h2>
        <div className="w-24 shrink-0 space-y-1 sm:w-32">
          <Label htmlFor="violation-page-size" className="hidden sm:block">
            Hiển thị
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger id="violation-page-size">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} dòng
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ViolationFilters
        classId={classId}
        studentId={studentId}
        date={date}
        onStudentChange={(v) => onFilterChange({ studentId: v })}
        onDateChange={(v) => onFilterChange({ date: v })}
      />

      {isLoading ? (
        <TableSkeleton columns={4} rows={Math.min(pageSize, 10)} />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <DataTable
          columns={violationColumns(deleteMutation.isPending, (id) =>
            deleteMutation.mutate(id, {
              onSuccess: () => toast.success("Đã xóa vi phạm"),
              onError: (err) => toast.error(err.message),
            }),
          )}
          data={violations}
          onRowClick={setViewing}
          emptyIcon={<ShieldAlert />}
          emptyTitle={
            studentId || date
              ? "Không có vi phạm nào khớp bộ lọc."
              : "Chưa có học sinh nào vi phạm."
          }
          emptyDescription="Ghi nhận vi phạm qua nút Ghi nhận vi phạm phía trên."
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ViolationDetailDialog
        violation={viewing}
        onClose={() => setViewing(null)}
      />
    </section>
  );
}
