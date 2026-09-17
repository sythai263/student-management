"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  ATTENDANCE_STATUS_HOVER,
  ATTENDANCE_STATUS_LIST,
  ATTENDANCE_STATUS_SHORT_LABEL,
} from "@constants";
import {
  useAddAttendanceRecord,
  useAttendanceRecords,
  useStudents,
} from "@hooks";
import { studentFullName } from "@lib/string";

interface SupplementaryAttendanceProps {
  sessionId: string;
  classId: string;
}

/**
 * Students of the class who have no record in this session — e.g. newly
 * added after the session was taken — so the teacher can back-fill them
 * ("điểm danh bổ sung"). Shown on both open and closed sessions.
 * Fetches the unfiltered record list itself: the board's `records` may be
 * narrowed by the status filter, which would wrongly list students as
 * missing.
 */
export function SupplementaryAttendance({
  sessionId,
  classId,
}: SupplementaryAttendanceProps) {
  const { data: students, isLoading: studentsLoading } = useStudents(classId);
  const { data: records, isLoading: recordsLoading } =
    useAttendanceRecords(sessionId);
  const addMutation = useAddAttendanceRecord(sessionId);

  const missing = useMemo(() => {
    const present = new Set((records ?? []).map((r) => r.studentId));
    return (students ?? []).filter((s) => !present.has(s.id));
  }, [students, records]);

  if (studentsLoading || recordsLoading) return <ListSkeleton rows={3} />;
  if (missing.length === 0) return null;

  return (
    <section className="space-y-3 rounded-md border border-dashed p-4">
      <div>
        <h3 className="text-base font-medium">
          Điểm danh bổ sung ({missing.length})
        </h3>
        <p className="text-sm text-muted-foreground">
          Học sinh chưa có trong buổi này — chọn trạng thái để thêm.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {missing.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-2.5 rounded-md border border-dashed p-3"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">
                  {studentFullName(s)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.studentCode ?? "—"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 border-amber-500/30 bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-400"
              >
                Mới
              </Badge>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {ATTENDANCE_STATUS_LIST.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 min-w-0 px-0 text-sm",
                    ATTENDANCE_STATUS_HOVER[status],
                  )}
                  disabled={addMutation.isPending}
                  onClick={() =>
                    addMutation.mutate(
                      { studentId: s.id, status },
                      {
                        onSuccess: () =>
                          toast.success(
                            `Đã thêm ${studentFullName(s)} vào buổi điểm danh`,
                          ),
                        onError: (err) => toast.error(err.message),
                      },
                    )
                  }
                >
                  {ATTENDANCE_STATUS_SHORT_LABEL[status]}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
