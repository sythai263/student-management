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
    <div className="space-y-3">
      {/* Primary actions + summary */}
      <div className="flex items-center gap-2">
        {closed ? (
          <Button variant="secondary" disabled>
            Đã đóng
          </Button>
        ) : (
          <Button
            variant="destructive"
            disabled={closing}
            onClick={onClose}
          >
            {closing ? "Đang đóng..." : "Đóng điểm danh"}
          </Button>
        )}
        <Button disabled={closed} onClick={onStartRollCall}>
          Điểm danh
        </Button>
        <Badge variant="secondary" className="ml-auto shrink-0">
          {present}/{total}
        </Badge>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2">
        <Input
          placeholder="Tìm theo tên / mã HS"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["ALL", "CO_MAT", "VANG", "VANG_PHEP", "BO_TIET", "DI_MUON"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => onFilterChange(f)}
              className="shrink-0"
            >
              {ATTENDANCE_FILTER_LABEL[f]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
