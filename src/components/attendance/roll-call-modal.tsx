"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_LIST,
  ATTENDANCE_STATUS_SHORT_LABEL,
  ROLL_CALL_SECONDS,
  type AttendanceStatus,
} from "@constants";
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
  const [timeLeft, setTimeLeft] = useState(ROLL_CALL_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const record = records[index];
  const isLast = index >= records.length - 1;

  const advance = useCallback(() => {
    setNote("");
    setPendingExcused(false);
    setTimeLeft(ROLL_CALL_SECONDS);
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

  // Countdown: each student has ROLL_CALL_SECONDS to respond.
  // Timeout -> auto-mark VANG and move on. Paused while entering a note.
  useEffect(() => {
    if (!open || pendingExcused || !record) return;
    setTimeLeft(ROLL_CALL_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Default to VANG; advance even if the mutation fails.
          updateMutation.mutate(
            { recordId: record.id, status: ATTENDANCE_STATUS.ABSENT },
            { onSettled: advance },
          );
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, pendingExcused]);

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
      else if (key === "b") mark(ATTENDANCE_STATUS.SKIPPED);
      else if (key === "m") mark(ATTENDANCE_STATUS.LATE);
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
      <DialogContent className="flex h-screen max-h-screen w-screen max-w-[100vw] flex-col justify-center gap-10 rounded-none border-0 p-12 sm:max-w-[100vw]">
        {/* Big countdown — top right corner */}
        {!pendingExcused && (
          <span
            className={`absolute right-16 top-8 text-9xl font-bold tabular-nums ${timeLeft <= 2 ? "text-destructive" : "text-primary"
              }`}
          >
            {timeLeft}
          </span>
        )}
        <DialogHeader className="gap-6">
          <DialogTitle className="text-8xl font-bold leading-tight">
            {s?.lastName} {s?.firstName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 text-3xl">
            <span>{s?.studentCode}</span>
            <Badge variant="secondary" className="text-xl">
              {index + 1}/{records.length}
            </Badge>
            {record.confidence != null && (
              <Badge
                variant={record.confidence >= 90 ? "default" : "secondary"}
                className="text-xl"
              >
                AI {record.confidence.toFixed(0)}%
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {pendingExcused ? (
          <div className="space-y-6">
            <Input
              autoFocus
              className="h-20 text-2xl"
              placeholder="Lý do vắng (bắt buộc) — Enter để xác nhận"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-4">
              <Button
                className="h-20 flex-1 text-2xl"
                disabled={!note.trim() || updateMutation.isPending}
                onClick={() => mark(ATTENDANCE_STATUS.EXCUSED)}
              >
                Xác nhận vắng phép
              </Button>
              <Button
                variant="outline"
                className="h-20 text-2xl"
                onClick={() => setPendingExcused(false)}
              >
                Quay lại
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            {ATTENDANCE_STATUS_LIST.map((status) => (
              <Button
                key={status}
                variant={record.status === status ? "default" : "outline"}
                className="h-32 flex-col gap-2 text-3xl"
                disabled={updateMutation.isPending}
                onClick={() => mark(status)}
              >
                {ATTENDANCE_STATUS_LABEL[status]}
                <span className="text-xl opacity-60">
                  ({ATTENDANCE_STATUS_SHORT_LABEL[status]})
                </span>
              </Button>
            ))}
          </div>
        )}

        <p className="text-center text-lg text-muted-foreground">
          Phím tắt: C = Có mặt · V = Vắng · P = Vắng phép · B = Bỏ tiết · M = Đi muộn
        </p>
      </DialogContent>
    </Dialog>
  );
}
