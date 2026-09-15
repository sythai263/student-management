"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAttendanceSessions, useCreateSession } from "@hooks";

interface SessionListProps {
  classId: string;
}

export function SessionList({ classId }: SessionListProps) {
  const router = useRouter();
  const { data: sessions, isLoading, error } = useAttendanceSessions(classId);
  const createSession = useCreateSession(classId);

  function onManualAttendance() {
    createSession.mutate(undefined, {
      onSuccess: (data) =>
        router.push(`/classes/${classId}/attendance/${data.sessionId}`),
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Buổi điểm danh</h2>
      </div>

      {createSession.error && (
        <p className="text-sm text-destructive">{createSession.error.message}</p>
      )}
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <ul className="space-y-2">
        {sessions?.map((s) => (
          <li key={s.id}>
            <Link
              href={`/classes/${classId}/attendance/${s.id}`}
              className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary"
            >
              <span className="font-medium">{s.sessionDate}</span>
              <Badge variant={s.imageKeys.length > 0 ? "default" : "secondary"}>
                {s.imageKeys.length > 0
                  ? `${s.imageKeys.length} ảnh`
                  : "Thủ công"}
              </Badge>
              {s.closed && (
                <Badge variant="outline">Đã đóng</Badge>
              )}
            </Link>
          </li>
        ))}
        {sessions?.length === 0 && (
          <p className="text-muted-foreground">Chưa có buổi điểm danh nào.</p>
        )}
      </ul>
    </section>
  );
}
