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
  /** When true the grid is for viewing only (session is closed). */
  disabled?: boolean;
  /** Open the per-student edit dialog when a card is clicked. */
  onSelect: (record: AttendanceRecordWithStudent) => void;
}

const AttendanceCard = memo(function AttendanceCard({
  record: r,
  pending,
  disabled,
  onMark,
  onSelect,
}: {
  record: AttendanceRecordWithStudent;
  pending: boolean;
  disabled?: boolean;
  onMark: (recordId: string, status: AttendanceStatus) => void;
  onSelect: (record: AttendanceRecordWithStudent) => void;
}) {
  return (
    <div
      className={`group flex flex-col gap-1 rounded-md border p-2 transition-colors ${disabled ? "cursor-default" : "cursor-pointer hover:border-primary"}`}
      onClick={() => !disabled && onSelect(r)}
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
      </div>
      {r.note && (
        <p className="truncate text-xs text-muted-foreground">{r.note}</p>
      )}
      <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        {ATTENDANCE_STATUS_LIST.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={r.status === s ? ATTENDANCE_STATUS_VARIANT[s] : "outline"}
            className="h-7 flex-1 px-0 text-xs"
            disabled={pending || disabled}
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
  disabled = false,
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
          disabled={disabled}
          onMark={(recordId, status) =>
            updateMutation.mutate({ recordId, status })
          }
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
