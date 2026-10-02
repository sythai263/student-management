"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ListSkeleton } from "../ui/list-skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { useAttendanceSessions, useMissingAttendanceCounts } from "@hooks";
import { sessionDisplayName } from "@lib/attendance-session";
import type { AttendanceSession } from "@types";
import { SessionRenameDialog } from "./session-rename-dialog";
import { SessionDeleteDialog } from "./session-delete-dialog";

interface SessionListProps {
  classId: string;
}

export function SessionList({ classId }: SessionListProps) {
  const { data: sessions, isLoading, error } = useAttendanceSessions(classId);
  const { data: missingCounts } = useMissingAttendanceCounts(classId);

  const [renaming, setRenaming] = useState<AttendanceSession | null>(null);
  const [deleting, setDeleting] = useState<AttendanceSession | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Buổi điểm danh</h2>
      </div>

      {isLoading && <ListSkeleton rows={4} />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <ul className="space-y-2">
        {sessions?.map((s) => {
          // Students on the roster with no record in this session.
          const missing = missingCounts
            ? missingCounts.total - (missingCounts.recorded[s.id] ?? 0)
            : 0;
          return (
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
                {missing > 0 && (
                  <Badge
                    variant="outline"
                    className="border-warning/30 bg-warning/15 text-warning"
                  >
                    {missing} bổ sung
                  </Badge>
                )}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Đổi tên buổi điểm danh"
                onClick={() => setRenaming(s)}
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
          );
        })}
      </ul>

      {sessions?.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCheck />
            </EmptyMedia>
            <EmptyTitle>Chưa có buổi điểm danh nào.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}

      <SessionRenameDialog
        classId={classId}
        session={renaming}
        onClose={() => setRenaming(null)}
      />
      <SessionDeleteDialog
        classId={classId}
        session={deleting}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
}
