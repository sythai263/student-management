"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
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
      className={`group flex flex-col gap-1.5 rounded-md border p-2 transition-colors ${disabled ? "cursor-default" : "cursor-pointer hover:border-primary active:bg-muted"}`}
      onClick={() => !disabled && onSelect(r)}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">
            {r.students?.lastName} {r.students?.firstName}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.students?.studentCode}
          </p>
        </div>
        <Badge
          variant={ATTENDANCE_STATUS_VARIANT[r.status]}
          className="shrink-0 px-1.5 py-0 text-[10px]"
        >
          {ATTENDANCE_STATUS_SHORT_LABEL[r.status]}
        </Badge>
      </div>
      {r.note && (
        <p className="truncate text-xs text-muted-foreground">{r.note}</p>
      )}
      {/* Quick-action buttons: always visible on touch devices */}
      <div className="grid grid-cols-5 gap-1">
        {ATTENDANCE_STATUS_LIST.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={r.status === s ? ATTENDANCE_STATUS_VARIANT[s] : "outline"}
            className="h-8 min-w-0 px-0 text-xs"
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
