"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAttendanceSessions,
  useCreateSession,
  useDeleteSession,
  useRenameSession,
} from "@hooks";
import { sessionDisplayName } from "@lib/attendance-session";
import type { AttendanceSession } from "@types";

interface SessionListProps {
  classId: string;
}

export function SessionList({ classId }: SessionListProps) {
  const router = useRouter();
  const { data: sessions, isLoading, error } = useAttendanceSessions(classId);
  const createSession = useCreateSession(classId);
  const renameSession = useRenameSession(classId);
  const deleteSession = useDeleteSession(classId);

  const [renaming, setRenaming] = useState<AttendanceSession | null>(null);
  const [deleting, setDeleting] = useState<AttendanceSession | null>(null);
  const [name, setName] = useState("");

  function onManualAttendance() {
    createSession.mutate(undefined, {
      onSuccess: (data) =>
        router.push(`/classes/${classId}/attendance/${data.sessionId}`),
    });
  }

  function openRename(session: AttendanceSession) {
    setName(sessionDisplayName(session));
    setRenaming(session);
  }

  function onRenameSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!renaming) return;
    renameSession.mutate(
      { sessionId: renaming.id, name },
      { onSuccess: () => setRenaming(null) },
    );
  }

  function onDeleteConfirm() {
    if (!deleting) return;
    deleteSession.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Buổi điểm danh</h2>
      </div>

      {createSession.error && (
        <p className="text-sm text-destructive">{createSession.error.message}</p>
      )}
      {isLoading && <ListSkeleton rows={4} />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <ul className="space-y-2">
        {sessions?.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-1 rounded-md border p-3 transition-colors hover:border-primary"
          >
            <Link
              href={`/classes/${classId}/attendance/${s.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="truncate font-medium">
                {sessionDisplayName(s)}
              </span>
              <Badge variant={s.imageKeys.length > 0 ? "default" : "secondary"}>
                {s.imageKeys.length > 0
                  ? `${s.imageKeys.length} ảnh`
                  : "Thủ công"}
              </Badge>
              {s.closed && <Badge variant="outline">Đã đóng</Badge>}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Đổi tên buổi điểm danh"
              onClick={() => openRename(s)}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label="Xóa buổi điểm danh"
              onClick={() => setDeleting(s)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
        {sessions?.length === 0 && (
          <p className="text-muted-foreground">Chưa có buổi điểm danh nào.</p>
        )}
      </ul>

      {/* Rename session */}
      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên buổi điểm danh</DialogTitle>
            <DialogDescription>
              Đặt lại tên để dễ tìm kiếm hơn.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onRenameSubmit} className="space-y-4">
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
            {renameSession.error && (
              <p className="text-sm text-destructive">
                {renameSession.error.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRenaming(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={renameSession.isPending}>
                {renameSession.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete session — hard delete, no way back */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa buổi điểm danh?</DialogTitle>
            <DialogDescription>
              Buổi &quot;{deleting ? sessionDisplayName(deleting) : ""}&quot; và
              toàn bộ bản ghi điểm danh sẽ bị xóa vĩnh viễn. Hành động này
              không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          {deleteSession.error && (
            <p className="text-sm text-destructive">
              {deleteSession.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleting(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSession.isPending}
              onClick={onDeleteConfirm}
            >
              {deleteSession.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
