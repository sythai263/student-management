"use client";

import { useMemo, useState } from "react";
import type { AttendanceStatus } from "@constants";
import {
  useAttendanceRecords,
  useAttendanceSession,
  useCloseSession,
} from "@hooks";
import { sessionDisplayName } from "@lib/attendance-session";
import { AttendanceBoardSkeleton } from "./attendance-board-skeleton";
import { AttendanceToolbar } from "./attendance-toolbar";
import { AttendanceGrid } from "./attendance-grid";
import { RecordEditDialog } from "./record-edit-dialog";
import { RollCallModal } from "./roll-call-modal";
import type { AttendanceRecordWithStudent } from "@hooks";

interface AttendanceBoardProps {
  sessionId: string;
}

export function AttendanceBoard({ sessionId }: AttendanceBoardProps) {
  // Status filter is applied server-side via the hook.
  const [filter, setFilter] = useState<AttendanceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [rollCallOpen, setRollCallOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecordWithStudent | null>(
    null,
  );

  const { data: session, isLoading: sessionLoading } = useAttendanceSession(sessionId);
  const {
    data: records,
    isLoading: recordsLoading,
    error,
  } = useAttendanceRecords(sessionId, filter);
  const closeSessionMutation = useCloseSession(sessionId);

  // Search stays client-side (name/code substring on the fetched subset).
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records ?? [];
    return (records ?? []).filter((r) => {
      const s = r.students;
      const name = `${s?.lastName ?? ""} ${s?.firstName ?? ""}`.toLowerCase();
      return name.includes(q) || s?.studentCode?.toLowerCase().includes(q);
    });
  }, [records, search]);

  // Roll-call order: roster order (lastName, firstName) — top to bottom.
  const rollCallOrder = useMemo(
    () =>
      [...(records ?? [])].sort((a, b) => {
        const an = `${a.students?.lastName ?? ""} ${a.students?.firstName ?? ""}`;
        const bn = `${b.students?.lastName ?? ""} ${b.students?.firstName ?? ""}`;
        return an.localeCompare(bn, "vi");
      }),
    [records],
  );

  if (sessionLoading || recordsLoading) return <AttendanceBoardSkeleton />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  const present = records?.filter((r) => r.status === "CO_MAT").length ?? 0;
  const closed = session?.closed ?? false;

  return (
    <div className="space-y-4">
      {session && (
        <h2 className="text-lg font-medium">{sessionDisplayName(session)}</h2>
      )}
      <AttendanceToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        present={present}
        total={records?.length ?? 0}
        closed={closed}
        closing={closeSessionMutation.isPending}
        onClose={() => closeSessionMutation.mutate()}
        onStartRollCall={() => setRollCallOpen(true)}
      />

      {closeSessionMutation.error && (
        <p className="text-sm text-destructive">
          {closeSessionMutation.error.message}
        </p>
      )}

      <AttendanceGrid
        sessionId={sessionId}
        records={visible}
        disabled={closed}
        onSelect={setEditing}
      />

      <RecordEditDialog
        sessionId={sessionId}
        record={editing}
        readOnly={closed}
        onClose={() => setEditing(null)}
      />

      <RollCallModal
        sessionId={sessionId}
        records={rollCallOrder}
        open={rollCallOpen && !closed}
        onOpenChange={setRollCallOpen}
      />
    </div>
  );
}
