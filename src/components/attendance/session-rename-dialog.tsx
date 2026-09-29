"use client";

import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useRenameSession } from "@hooks";
import { sessionDisplayName } from "@lib/attendance-session";
import type { AttendanceSession } from "@types";

interface SessionRenameDialogProps {
  classId: string;
  session: AttendanceSession | null;
  onClose: () => void;
}

export function SessionRenameDialog({
  classId,
  session,
  onClose,
}: SessionRenameDialogProps) {
  const renameSession = useRenameSession(classId);
  const [name, setName] = useState("");
  const [prevSession, setPrevSession] = useState(session);

  // Reset the draft name each time a different session is opened.
  if (prevSession !== session) {
    setPrevSession(session);
    setName(session ? sessionDisplayName(session) : "");
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!session) return;
    renameSession.mutate(
      { sessionId: session.id, name },
      {
        onSuccess: () => {
          toast.success("Đã đổi tên buổi điểm danh");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên buổi điểm danh</DialogTitle>
          <DialogDescription>
            Đặt lại tên để dễ tìm kiếm hơn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Tên buổi</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={renameSession.isPending}>
              {renameSession.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
