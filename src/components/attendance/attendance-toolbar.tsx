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
  closed: boolean;
  closing: boolean;
  onClose: () => void;
  onStartRollCall: () => void;
}

export function AttendanceToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  present,
  total,
  closed,
  closing,
  onClose,
  onStartRollCall,
}: AttendanceToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {closed ? (
        <Button size="lg" variant="secondary" disabled>
          Đã đóng điểm danh
        </Button>
      ) : (
        <Button
          size="lg"
          variant="destructive"
          disabled={closing}
          onClick={onClose}
        >
          {closing ? "Đang đóng..." : "Đóng điểm danh"}
        </Button>
      )}
      <Button size="lg" disabled={closed} onClick={onStartRollCall}>
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
      <Badge variant="secondary">
        {present}/{total} có mặt
      </Badge>
    </div>
  );
}
