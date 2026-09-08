"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceRecordWithStudent } from "@hooks";
import { AttendanceRow } from "./attendance-row";

interface AttendanceTableProps {
  records: AttendanceRecordWithStudent[];
}

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
            <AttendanceRow key={r.id} record={r} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
