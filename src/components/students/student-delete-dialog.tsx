"use client";

import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useDeleteStudent } from "@hooks";
import { studentFullName } from "@lib/string";
import type { Student } from "@types";

interface StudentDeleteDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful delete — parent closes the edit dialog. */
  onDeleted: () => void;
}

/** Hard delete: attendance records and grades cascade via FK,
    face vector + avatar are cleaned up too. */
export function StudentDeleteDialog({
  student,
  open,
  onOpenChange,
  onDeleted,
}: StudentDeleteDialogProps) {
  const deleteStudent = useDeleteStudent(student?.classId ?? "");

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa học sinh</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xóa <strong>{studentFullName(student)}</strong>?
            Toàn bộ điểm danh và điểm số của học sinh sẽ bị xóa vĩnh viễn.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteStudent.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              deleteStudent.mutate(student.id, {
                onSuccess: () => {
                  toast.success("Đã xóa học sinh");
                  onOpenChange(false);
                  onDeleted();
                },
                onError: (err) => toast.error(err.message),
              })
            }
            disabled={deleteStudent.isPending}
          >
            {deleteStudent.isPending ? "Đang xóa..." : "Xóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
