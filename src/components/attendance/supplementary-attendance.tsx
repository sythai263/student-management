"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  ATTENDANCE_STATUS_HOVER,
  ATTENDANCE_STATUS_LIST,
  ATTENDANCE_STATUS_SHORT_LABEL,
} from "@constants";
import {
  useAddAttendanceRecord,
  useStudents,
  type AttendanceRecordWithStudent,
} from "@hooks";

interface SupplementaryAttendanceProps {
  sessionId: string;
  classId: string;
  records: AttendanceRecordWithStudent[];
}

/**
 * Students of the class who have no record in this session — shown on
 * closed sessions so the teacher can back-fill them ("điểm danh bổ sung").
 */
export function SupplementaryAttendance({
  sessionId,
  classId,
  records,
}: SupplementaryAttendanceProps) {
  const { data: students, isLoading } = useStudents(classId);
  const addMutation = useAddAttendanceRecord(sessionId);

  const missing = useMemo(() => {
    const present = new Set(records.map((r) => r.studentId));
    return (students ?? []).filter((s) => !present.has(s.id));
  }, [students, records]);

  if (isLoading) return <ListSkeleton rows={3} />;
  if (missing.length === 0) return null;

  return (
    <section className="space-y-2 rounded-md border border-dashed p-3">
      <div>
        <h3 className="text-base font-medium">
          Điểm danh bổ sung ({missing.length})
        </h3>
        <p className="text-sm text-muted-foreground">
          Học sinh chưa có trong buổi này — chọn trạng thái để thêm.
        </p>
      </div>
      <ul className="divide-y">
        {missing.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {s.lastName} {s.firstName}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.studentCode ?? "—"}
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-5 gap-1">
              {ATTENDANCE_STATUS_LIST.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-8 min-w-0 px-0 text-xs",
                    ATTENDANCE_STATUS_HOVER[status],
                  )}
                  disabled={addMutation.isPending}
                  onClick={() =>
                    addMutation.mutate(
                      { studentId: s.id, status },
                      {
                        onSuccess: () =>
                          toast.success(
                            `Đã thêm ${s.lastName} ${s.firstName} vào buổi điểm danh`,
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
          </li>
        ))}
      </ul>
    </section>
  );
}
