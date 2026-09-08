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
import type { AttendanceStatus } from "@constants";
import type { AttendanceRecordWithStudent } from "@hooks";

interface AttendanceTableProps {
  records: AttendanceRecordWithStudent[];
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "Có mặt",
  VANG: "Vắng",
  VANG_PHEP: "Vắng phép",
};

const STATUS_VARIANT: Record<
  AttendanceStatus,
  "default" | "secondary" | "destructive"
> = {
  CO_MAT: "default",
  VANG: "destructive",
  VANG_PHEP: "secondary",
};

/** Read-only result table — editing happens in the roll-call modal. */
export function AttendanceTable({ records }: AttendanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã HS</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.students?.studentCode}</TableCell>
              <TableCell>
                {r.students?.lastName} {r.students?.firstName}
              </TableCell>
              <TableCell>
                {r.confidence != null ? (
                  <Badge variant={r.confidence >= 90 ? "default" : "secondary"}>
                    {r.confidence.toFixed(0)}%
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]}>
                  {STATUS_LABEL[r.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {r.note ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
