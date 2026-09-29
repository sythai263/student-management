"use client";

import { FilterX } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useStudents } from "@hooks";
import { studentFullName } from "@lib/string";

const ALL_STUDENTS = "__all__";

interface ViolationFiltersProps {
  classId: string;
  /** Selected student id, "" = all. */
  studentId: string;
  /** Local calendar day yyyy-mm-dd, "" = all dates. */
  date: string;
  onStudentChange: (studentId: string) => void;
  onDateChange: (date: string) => void;
}

export function ViolationFilters({
  classId,
  studentId,
  date,
  onStudentChange,
  onDateChange,
}: ViolationFiltersProps) {
  const { data: students } = useStudents(classId);
  const hasFilter = studentId !== "" || date !== "";

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1 sm:w-56 sm:flex-none">
        <Label htmlFor="violation-student" className="hidden sm:block">
          Học sinh
        </Label>
        <Select
          value={studentId || ALL_STUDENTS}
          onValueChange={(v) =>
            onStudentChange(v === ALL_STUDENTS ? "" : v)
          }
        >
          <SelectTrigger id="violation-student" className="w-full">
            <SelectValue placeholder="Tất cả học sinh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STUDENTS}>Tất cả học sinh</SelectItem>
            {students?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {studentFullName(s)}
                {s.studentCode ? ` (${s.studentCode})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="violation-date" className="hidden sm:block">
          Ngày vi phạm
        </Label>
        <Input
          id="violation-date"
          type="date"
          className="w-40"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      {hasFilter && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Xóa bộ lọc"
          onClick={() => {
            onStudentChange("");
            onDateChange("");
          }}
        >
          <FilterX />
        </Button>
      )}
    </div>
  );
}
