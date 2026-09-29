"use client";

import { useEffect, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Pagination } from "../ui/pagination";
import { ListSkeleton } from "../ui/list-skeleton";
import { TableSkeleton } from "../ui/table-skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useDebounce, usePaginatedStudents } from "@hooks";
import type { Student } from "@types";
import { DataTable } from "../data-table";
import { StudentCardList } from "./student-card-list";
import { StudentEditDialog } from "./student-edit-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function studentColumns(rowOffset: number): ColumnDef<Student>[] {
  return [
    {
      id: "stt",
      header: "STT",
      cell: ({ row }) => rowOffset + row.index + 1,
      meta: { headerClassName: "w-16 whitespace-nowrap" },
    },
    {
      accessorKey: "studentCode",
      header: "Mã HS",
      cell: ({ getValue }) => getValue<string | null>() ?? "—",
      meta: { headerClassName: "whitespace-nowrap" },
    },
    {
      accessorKey: "lastName",
      header: "Họ",
      meta: { headerClassName: "w-max whitespace-nowrap" },
    },
    {
      id: "firstName",
      header: "Tên",
      cell: ({ row }) =>
        row.original.firstName +
        (row.original.nameSuffix ? ` (${row.original.nameSuffix})` : ""),
      meta: { headerClassName: "w-max whitespace-nowrap" },
    },
    {
      accessorKey: "dateOfBirth",
      header: "Ngày sinh",
      cell: ({ getValue }) => getValue<string | null>() ?? "—",
    },
    {
      id: "face",
      header: "Ảnh khuôn mặt",
      cell: ({ row }) =>
        row.original.awsFaceId ? (
          <Badge>Đã có ảnh</Badge>
        ) : (
          <Badge variant="secondary">Chưa có ảnh</Badge>
        ),
    },
  ];
}

interface StudentTableProps {
  classId: string;
}

export function StudentTable({ classId }: StudentTableProps) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<Student | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    data: { students, total, totalPages },
    isLoading,
    error,
  } = usePaginatedStudents(classId, { page, pageSize, search });

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-medium">Danh sách học sinh ({total})</h2>
        <div className="flex gap-2 sm:items-end">
          <div className="min-w-0 flex-1 space-y-1 sm:w-64 sm:flex-none">
            <Label htmlFor="student-search" className="hidden sm:block">
              Tìm kiếm
            </Label>
            <Input
              id="student-search"
              ref={inputRef}
              placeholder="Mã HS, họ hoặc tên..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-24 shrink-0 space-y-1 sm:w-32">
            <Label htmlFor="page-size" className="hidden sm:block">
              Hiển thị
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger id="page-size">
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
      </div>

      {isLoading ? (
        <>
          {/* Mobile: skeleton rows matching the card list */}
          <ListSkeleton
            rows={Math.min(pageSize, 10)}
            className="sm:hidden"
            itemClassName="h-[3.75rem]"
          />
          <div className="hidden sm:block">
            <TableSkeleton columns={6} rows={pageSize} />
          </div>
        </>
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : students.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Không có học sinh nào.</EmptyTitle>
            {search ? (
              <EmptyDescription>
                Thử từ khóa khác hoặc thêm học sinh mới vào lớp.
              </EmptyDescription>
            ) : null}
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Mobile: compact card list */}
          <StudentCardList students={students} onSelect={setEditing} />

          {/* Desktop: full table — pagination stays server-side */}
          <div className="hidden sm:block">
            <DataTable
              columns={studentColumns((page - 1) * pageSize)}
              data={students}
              onRowClick={setEditing}
            />
          </div>
        </>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <StudentEditDialog student={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
