"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_CLASS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_LIST,
  type AttendanceStatus,
} from "@constants";
import {
  useUpdateAttendance,
  type AttendanceRecordWithStudent,
} from "@hooks";

interface RecordEditDialogProps {
  sessionId: string;
  record: AttendanceRecordWithStudent | null;
  readOnly?: boolean;
  onClose: () => void;
}

/** Per-student edit dialog — fix status/note when AI or roll-call got it wrong. */
export function RecordEditDialog({
  sessionId,
  record,
  readOnly = false,
  onClose,
}: RecordEditDialogProps) {
  const updateMutation = useUpdateAttendance(sessionId);
  const [status, setStatus] = useState<AttendanceStatus>("VANG");
  const [note, setNote] = useState("");

  // Sync form state whenever a different record is opened.
  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setNote(record.note ?? "");
    }
  }, [record]);

  if (!record) return null;
  const s = record.students;
  const needsNote = status === ATTENDANCE_STATUS.EXCUSED && !note.trim();

  function onSave() {
    if (!record || readOnly) return;
    updateMutation.mutate(
      {
        recordId: record.id,
        status,
        note: status === ATTENDANCE_STATUS.EXCUSED ? note : undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {s?.lastName} {s?.firstName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{s?.studentCode}</span>
            {record.confidence != null && (
              <Badge variant={record.confidence >= 90 ? "default" : "secondary"}>
                Nhận diện {record.confidence.toFixed(0)}%
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {ATTENDANCE_STATUS_LIST.map((st) => (
              <Button
                key={st}
                variant="outline"
                disabled={readOnly}
                onClick={() => setStatus(st)}
                className={cn(
                  "h-12 text-base sm:text-sm",
                  status === st && ATTENDANCE_STATUS_CLASS[st],
                )}
              >
                {ATTENDANCE_STATUS_LABEL[st]}
              </Button>
            ))}
          </div>

          {status === ATTENDANCE_STATUS.EXCUSED && (
            <div className="space-y-2">
              <Label htmlFor="note">Lý do vắng (bắt buộc)</Label>
              <Input
                id="note"
                autoFocus
                value={note}
                disabled={readOnly}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: ốm, có đơn..."
              />
            </div>
          )}

          {updateMutation.error && (
            <p className="text-sm text-destructive">
              {updateMutation.error.message}
            </p>
          )}

          {!readOnly && (
            <Button
              className="w-full"
              size="lg"
              disabled={needsNote || updateMutation.isPending}
              onClick={onSave}
            >
              {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
