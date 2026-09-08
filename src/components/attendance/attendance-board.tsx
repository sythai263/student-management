"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ATTENDANCE_STATUS, type AttendanceStatus } from "@constants";
import {
  useAttendanceRecords,
  useMarkAllPresent,
  useUpdateAttendance,
  type AttendanceRecordWithStudent,
} from "@hooks";

interface AttendanceBoardProps {
  sessionId: string;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  CO_MAT: "Có mặt",
  VANG: "Vắng",
  VANG_PHEP: "V. phép",
};

const STATUS_ORDER: Record<AttendanceStatus, number> = {
  VANG: 0,
  VANG_PHEP: 1,
  CO_MAT: 2,
};

export function AttendanceBoard({ sessionId }: AttendanceBoardProps) {
  const { data: records, isLoading, error } = useAttendanceRecords(sessionId);
  const updateMutation = useUpdateAttendance(sessionId);
  const markAllMutation = useMarkAllPresent(sessionId);

  const [filter, setFilter] = useState<AttendanceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

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

  function setStatus(record: AttendanceRecordWithStudent, status: AttendanceStatus) {
    const note = noteDrafts[record.id] ?? record.note ?? undefined;
    updateMutation.mutate({ recordId: record.id, status, note });
  }

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  const present = records?.filter((r) => r.status === "CO_MAT").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Tìm theo tên / mã HS"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {(["ALL", "CO_MAT", "VANG", "VANG_PHEP"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "Tất cả" : STATUS_LABEL[f]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          disabled={markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
        >
          Tất cả có mặt
        </Button>
        <Badge variant="secondary">
          {present}/{records?.length ?? 0} có mặt
        </Badge>
      </div>

      {updateMutation.error && (
        <p className="text-sm text-destructive">{updateMutation.error.message}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã HS</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.students?.studentCode}</TableCell>
              <TableCell>
                {r.students?.lastName} {r.students?.firstName}
              </TableCell>
              <TableCell>
                {r.confidence != null ? (
                  <Badge
                    variant={r.confidence >= 90 ? "default" : "secondary"}
                  >
                    {r.confidence.toFixed(0)}%
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {(
                    [
                      ATTENDANCE_STATUS.PRESENT,
                      ATTENDANCE_STATUS.ABSENT,
                      ATTENDANCE_STATUS.EXCUSED,
                    ] as const
                  ).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={r.status === s ? "default" : "outline"}
                      disabled={updateMutation.isPending}
                      onClick={() => setStatus(r, s)}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {r.status === ATTENDANCE_STATUS.EXCUSED && (
                  <Input
                    placeholder="Lý do (bắt buộc)"
                    defaultValue={r.note ?? ""}
                    onChange={(e) =>
                      setNoteDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                    }
                    onBlur={(e) => {
                      if (e.target.value !== (r.note ?? "")) {
                        updateMutation.mutate({
                          recordId: r.id,
                          status: r.status,
                          note: e.target.value,
                        });
                      }
                    }}
                    className="max-w-48"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
