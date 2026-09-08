"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_LIST,
  ATTENDANCE_STATUS_SHORT_LABEL,
  ATTENDANCE_STATUS_VARIANT,
  type AttendanceStatus,
} from "@constants";
import {
  useUpdateAttendance,
  type AttendanceRecordWithStudent,
} from "@hooks";

interface AttendanceGridProps {
  sessionId: string;
  records: AttendanceRecordWithStudent[];
  /** Open the per-student edit dialog when a card is clicked. */
  onSelect: (record: AttendanceRecordWithStudent) => void;
}

const AttendanceCard = memo(function AttendanceCard({
  record: r,
  pending,
  onMark,
  onSelect,
}: {
  record: AttendanceRecordWithStudent;
  pending: boolean;
  onMark: (recordId: string, status: AttendanceStatus) => void;
  onSelect: (record: AttendanceRecordWithStudent) => void;
}) {
  return (
    <div
      className="flex cursor-pointer flex-col gap-1 rounded-md border p-2 transition-colors hover:border-primary"
      onClick={() => onSelect(r)}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-medium">
          {r.students?.lastName} {r.students?.firstName}
        </span>
        <Badge variant={ATTENDANCE_STATUS_VARIANT[r.status]}>
          {ATTENDANCE_STATUS_LABEL[r.status]}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{r.students?.studentCode}</span>
        {r.confidence != null && <span>AI {r.confidence.toFixed(0)}%</span>}
      </div>
      {r.note && (
        <p className="truncate text-xs text-muted-foreground">{r.note}</p>
      )}
      <div className="flex gap-1">
        {ATTENDANCE_STATUS_LIST.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={r.status === s ? "default" : "outline"}
            className="h-7 flex-1 px-0 text-xs"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              onMark(r.id, s);
            }}
          >
            {ATTENDANCE_STATUS_SHORT_LABEL[s]}
          </Button>
        ))}
      </div>
    </div>
  );
});

/** Grid view of attendance records — compact cards, quick C/V/P/B/M marking. */
export function AttendanceGrid({
  sessionId,
  records,
  onSelect,
}: AttendanceGridProps) {
  const updateMutation = useUpdateAttendance(sessionId);

  if (records.length === 0) {
    return <p className="text-muted-foreground">Không có bản ghi nào.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {records.map((r) => (
        <AttendanceCard
          key={r.id}
          record={r}
          pending={updateMutation.isPending}
          onMark={(recordId, status) =>
            updateMutation.mutate({ recordId, status })
          }
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
