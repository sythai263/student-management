"use client";

import { Badge } from "../ui/badge";
import { studentFullName } from "@lib/string";
import type { Student } from "@types";

interface StudentCardListProps {
  students: Student[];
  onSelect: (student: Student) => void;
}

/** Compact card list for phones — the full table doesn't fit small screens. */
export function StudentCardList({ students, onSelect }: StudentCardListProps) {
  return (
    <ul className="space-y-2 sm:hidden">
      {students.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left active:bg-muted"
            onClick={() => onSelect(s)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {studentFullName(s)}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.studentCode ?? "—"}
                {s.dateOfBirth ? ` · ${s.dateOfBirth}` : ""}
              </p>
            </div>
            {s.awsFaceId ? (
              <Badge className="shrink-0">Đã có ảnh</Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">
                Chưa có ảnh
              </Badge>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
