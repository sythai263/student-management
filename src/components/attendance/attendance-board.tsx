"use client";

import { useMemo, useState } from "react";
import type { AttendanceStatus } from "@constants";
import {
  useAttendanceRecords,
  useMarkAllPresent,
} from "@hooks";
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

  const {
    data: records,
    isLoading,
    error,
  } = useAttendanceRecords(sessionId, filter);
  const markAllMutation = useMarkAllPresent(sessionId);

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

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  const present = records?.filter((r) => r.status === "CO_MAT").length ?? 0;

  return (
    <div className="space-y-4">
      <AttendanceToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        present={present}
        total={records?.length ?? 0}
        markingAll={markAllMutation.isPending}
        onMarkAll={() => markAllMutation.mutate()}
        onStartRollCall={() => setRollCallOpen(true)}
      />

      {markAllMutation.error && (
        <p className="text-sm text-destructive">
          {markAllMutation.error.message}
        </p>
      )}

      <AttendanceGrid
        sessionId={sessionId}
        records={visible}
        onSelect={setEditing}
      />

      <RecordEditDialog
        sessionId={sessionId}
        record={editing}
        onClose={() => setEditing(null)}
      />

      <RollCallModal
        sessionId={sessionId}
        records={rollCallOrder}
        open={rollCallOpen}
        onOpenChange={setRollCallOpen}
      />
    </div>
  );
}
