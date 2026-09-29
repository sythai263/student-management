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
import { useDeleteSession } from "@hooks";
import { sessionDisplayName } from "@lib/attendance-session";
import type { AttendanceSession } from "@types";

interface SessionDeleteDialogProps {
  classId: string;
  session: AttendanceSession | null;
  onClose: () => void;
}

/** Hard delete, no way back. */
export function SessionDeleteDialog({
  classId,
  session,
  onClose,
}: SessionDeleteDialogProps) {
  const deleteSession = useDeleteSession(classId);

  function onConfirm() {
    if (!session) return;
    deleteSession.mutate(session.id, {
      onSuccess: () => {
        toast.success("Đã xóa buổi điểm danh");
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa buổi điểm danh?</DialogTitle>
          <DialogDescription>
            Buổi &quot;{session ? sessionDisplayName(session) : ""}&quot; và
            toàn bộ bản ghi điểm danh sẽ bị xóa vĩnh viễn. Hành động này
            không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteSession.isPending}
            onClick={onConfirm}
          >
            {deleteSession.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
