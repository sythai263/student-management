"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce, usePaginatedStudents } from "@hooks";
import type { Student } from "@types";
import { StudentEditDialog } from "./student-edit-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-medium">Danh sách học sinh ({total})</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="space-y-1 sm:w-64">
            <Label htmlFor="student-search">Tìm kiếm</Label>
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
          <div className="space-y-1 sm:w-32">
            <Label htmlFor="page-size">Hiển thị</Label>
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
        <TableSkeleton columns={6} rows={pageSize} />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 whitespace-nowrap">STT</TableHead>
              <TableHead className="whitespace-nowrap">Mã HS</TableHead>
              <TableHead className="w-max whitespace-nowrap">Họ</TableHead>
              <TableHead className="w-max whitespace-nowrap">Tên</TableHead>
              <TableHead>Ngày sinh</TableHead>
              <TableHead>Face ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Không có học sinh nào.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s, index) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => setEditing(s)}
                >
                  <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                  <TableCell>{s.studentCode}</TableCell>
                  <TableCell>{s.lastName}</TableCell>
                  <TableCell>{s.firstName}</TableCell>
                  <TableCell>{s.dateOfBirth ?? "—"}</TableCell>
                  <TableCell>
                    {s.awsFaceId ? (
                      <Badge>Đã index</Badge>
                    ) : (
                      <Badge variant="secondary">Chưa có</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <StudentEditDialog student={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
