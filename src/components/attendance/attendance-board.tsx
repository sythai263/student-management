"use client";

import { useMemo, useState } from "react";
import type { AttendanceStatus } from "@constants";
import {
  useAttendanceRecords,
  useMarkAllPresent,
} from "@hooks";
import { AttendanceToolbar } from "./attendance-toolbar";
import { AttendanceTable } from "./attendance-table";
import { RollCallModal } from "./roll-call-modal";

interface AttendanceBoardProps {
  sessionId: string;
}

const STATUS_ORDER: Record<AttendanceStatus, number> = {
  VANG: 0,
  VANG_PHEP: 1,
  CO_MAT: 2,
};

export function AttendanceBoard({ sessionId }: AttendanceBoardProps) {
  const { data: records, isLoading, error } = useAttendanceRecords(sessionId);
  const markAllMutation = useMarkAllPresent(sessionId);

  const [filter, setFilter] = useState<AttendanceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [rollCallOpen, setRollCallOpen] = useState(false);

  // Table view: absent-first so the teacher reviews exceptions first.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (records ?? [])
      .filter((r) => filter === "ALL" || r.status === filter)
      .filter((r) => {
        if (!q) return true;
        const s = r.students;
        const name = `${s?.lastName ?? ""} ${s?.firstName ?? ""}`.toLowerCase();
        return name.includes(q) || s?.studentCode?.toLowerCase().includes(q);
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [records, filter, search]);

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

      <AttendanceTable records={visible} />

      <RollCallModal
        sessionId={sessionId}
        records={rollCallOrder}
        open={rollCallOpen}
        onOpenChange={setRollCallOpen}
      />
    </div>
  );
}
