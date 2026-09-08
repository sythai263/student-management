"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AttendanceStatus } from "@constants";
import type { AttendanceRecordWithStudent } from "@hooks";

interface AttendanceRowProps {
  record: AttendanceRecordWithStudent;
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

/** Memoized row — only re-renders when its own record changes. */
export const AttendanceRow = memo(function AttendanceRow({
  record: r,
}: AttendanceRowProps) {
  return (
    <TableRow>
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
        <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{r.note ?? "—"}</TableCell>
    </TableRow>
  );
});
