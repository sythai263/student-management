"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudents } from "@hooks";

interface StudentTableProps {
  classId: string;
}

export function StudentTable({ classId }: StudentTableProps) {
  const { data: students, isLoading, error } = useStudents(classId);

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium">
        Danh sách học sinh ({students?.length ?? 0})
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã HS</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Ngày sinh</TableHead>
            <TableHead>Face ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students?.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.studentCode}</TableCell>
              <TableCell>
                {s.lastName} {s.firstName}
              </TableCell>
              <TableCell>{s.dateOfBirth ?? "—"}</TableCell>
              <TableCell>
                {s.awsFaceId ? (
                  <Badge>Đã index</Badge>
                ) : (
                  <Badge variant="secondary">Chưa có</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
