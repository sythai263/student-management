"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ATTENDANCE_STATUS, type AttendanceStatus } from "@constants";
import {
  useUpdateAttendance,
  type AttendanceRecordWithStudent,
} from "@hooks";

interface RollCallModalProps {
  sessionId: string;
  /** Records in roll-call order (roster order). */
  records: AttendanceRecordWithStudent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "Có mặt",
  VANG: "Vắng",
  VANG_PHEP: "V. phép",
};

export function RollCallModal({
  sessionId,
  records,
  open,
  onOpenChange,
}: RollCallModalProps) {
  const updateMutation = useUpdateAttendance(sessionId);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [pendingExcused, setPendingExcused] = useState(false);

  const record = records[index];
  const isLast = index >= records.length - 1;

  const advance = useCallback(() => {
    setNote("");
    setPendingExcused(false);
    if (isLast) {
      onOpenChange(false);
    } else {
      setIndex((i) => i + 1);
    }
  }, [isLast, onOpenChange]);

  const mark = useCallback(
    (status: AttendanceStatus) => {
      if (!record) return;
      // VANG_PHEP requires a reason — show the note step first.
      if (status === ATTENDANCE_STATUS.EXCUSED && !pendingExcused) {
        setPendingExcused(true);
        return;
      }
      updateMutation.mutate(
        {
          recordId: record.id,
          status,
          note: status === ATTENDANCE_STATUS.EXCUSED ? note : undefined,
        },
        { onSuccess: advance },
      );
    },
    [record, pendingExcused, note, updateMutation, advance],
  );

  // Keyboard shortcuts inside the modal: C / V / P, Enter confirms note.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (typing) {
        if (e.key === "Enter" && pendingExcused && note.trim()) {
          e.preventDefault();
          mark(ATTENDANCE_STATUS.EXCUSED);
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "c") mark(ATTENDANCE_STATUS.PRESENT);
      else if (key === "v") mark(ATTENDANCE_STATUS.ABSENT);
      else if (key === "p") mark(ATTENDANCE_STATUS.EXCUSED);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, mark, pendingExcused, note]);

  // Reset cursor each time the modal opens.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setNote("");
      setPendingExcused(false);
    }
  }, [open]);

  if (!record) return null;
  const s = record.students;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {s?.lastName} {s?.firstName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{s?.studentCode}</span>
            <Badge variant="secondary">
              {index + 1}/{records.length}
            </Badge>
            {record.confidence != null && (
              <Badge variant={record.confidence >= 90 ? "default" : "secondary"}>
                AI {record.confidence.toFixed(0)}%
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {pendingExcused ? (
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Lý do vắng (bắt buộc) — Enter để xác nhận"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!note.trim() || updateMutation.isPending}
                onClick={() => mark(ATTENDANCE_STATUS.EXCUSED)}
              >
                Xác nhận vắng phép
              </Button>
              <Button variant="outline" onClick={() => setPendingExcused(false)}>
                Quay lại
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ATTENDANCE_STATUS.PRESENT,
                ATTENDANCE_STATUS.ABSENT,
                ATTENDANCE_STATUS.EXCUSED,
              ] as const
            ).map((status) => (
              <Button
                key={status}
                size="lg"
                variant={record.status === status ? "default" : "outline"}
                disabled={updateMutation.isPending}
                onClick={() => mark(status)}
              >
                {STATUS_LABEL[status]}
                <span className="ml-1 text-xs opacity-60">
                  ({status === "CO_MAT" ? "C" : status === "VANG" ? "V" : "P"})
                </span>
              </Button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Phím tắt: C = Có mặt · V = Vắng · P = Vắng phép
        </p>
      </DialogContent>
    </Dialog>
  );
}
