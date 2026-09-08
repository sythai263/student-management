"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ATTENDANCE_FILTER_LABEL,
  type AttendanceStatus,
} from "@constants";

interface AttendanceToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filter: AttendanceStatus | "ALL";
  onFilterChange: (f: AttendanceStatus | "ALL") => void;
  present: number;
  total: number;
  markingAll: boolean;
  onMarkAll: () => void;
  onStartRollCall: () => void;
}

export function AttendanceToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  present,
  total,
  markingAll,
  onMarkAll,
  onStartRollCall,
}: AttendanceToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="lg" onClick={onStartRollCall}>
        Bắt đầu điểm danh
      </Button>
      <Input
        placeholder="Tìm theo tên / mã HS"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />
      {(["ALL", "CO_MAT", "VANG", "VANG_PHEP", "BO_TIET", "DI_MUON"] as const).map((f) => (
        <Button
          key={f}
          size="sm"
          variant={filter === f ? "default" : "outline"}
          onClick={() => onFilterChange(f)}
        >
          {ATTENDANCE_FILTER_LABEL[f]}
        </Button>
      ))}
      <Button
        size="sm"
        variant="secondary"
        disabled={markingAll}
        onClick={onMarkAll}
      >
        Tất cả có mặt
      </Button>
      <Badge variant="secondary">
        {present}/{total} có mặt
      </Badge>
    </div>
  );
}
