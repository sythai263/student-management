"use client";

import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { studentFullName } from "@lib/string";
import type { StudentViolationWithStudent } from "@types";

interface ViolationDetailDialogProps {
  violation: StudentViolationWithStudent | null;
  onClose: () => void;
}

export function ViolationDetailDialog({
  violation,
  onClose,
}: ViolationDetailDialogProps) {
  if (!violation) return null;

  const student = violation.students;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chi tiết vi phạm</DialogTitle>
          <DialogDescription>
            {dayjs(violation.recordedAt).format("HH:mm · DD/MM/YYYY")}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Học sinh</dt>
            <dd className="text-right font-medium">
              {student ? studentFullName(student) : "—"}
              {student?.studentCode ? (
                <span className="ml-1 text-muted-foreground">
                  ({student.studentCode})
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Nội dung</dt>
            <dd className="text-right break-words whitespace-pre-line">
              {violation.content}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Thời điểm</dt>
            <dd>
              {dayjs(violation.recordedAt).format("HH:mm:ss · DD/MM/YYYY")}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
