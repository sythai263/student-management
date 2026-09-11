"use client";

import { useEffect, useState, useTransition, type FormEventHandler } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrades, useSaveGrades, useStudents } from "@hooks";
import { GRADE_SLOT_FULL_LABEL, GRADE_SLOTS } from "@constants";
import { calculateAverage } from "@lib/grade-utils";
import { ImportGradesForm } from "./import-grades-form";
import type { GradeWithStudent } from "@types";

interface GradeEntryGridProps {
  classId: string;
  subjectId: string;
  subjectName: string;
  semester: number;
}

type ScoreInput = {
  tx1: string;
  tx2: string;
  tx3: string;
  tx4: string;
  gk: string;
  ck: string;
  note: string;
  comment: string;
};

const EMPTY_INPUT: ScoreInput = {
  tx1: "",
  tx2: "",
  tx3: "",
  tx4: "",
  gk: "",
  ck: "",
  note: "",
  comment: "",
};

function parseScore(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return n;
}

function formatScore(value: number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function parseInputScores(input: ScoreInput) {
  return {
    tx1: parseScore(input.tx1),
    tx2: parseScore(input.tx2),
    tx3: parseScore(input.tx3),
    tx4: parseScore(input.tx4),
    gk: parseScore(input.gk),
    ck: parseScore(input.ck),
  };
}

export function GradeEntryGrid({
  classId,
  subjectId,
  subjectName,
  semester,
}: GradeEntryGridProps) {
  const { data: students, isLoading: studentsLoading } = useStudents(classId);
  const { data: grades, isLoading: gradesLoading } = useGrades(
    classId,
    subjectId,
    semester,
  );
  const save = useSaveGrades(classId, subjectId, semester);
  const [entries, setEntries] = useState<Record<string, ScoreInput>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLoading = studentsLoading || gradesLoading;

  useEffect(() => {
    if (!students || !grades) return;
    const gradeMap = new Map<string, GradeWithStudent>();
    for (const g of grades) {
      gradeMap.set(g.studentId, g);
    }

    setEntries((prev) => {
      const next: Record<string, ScoreInput> = {};
      for (const s of students) {
        const existing = prev[s.id];
        if (existing && touched.has(s.id)) {
          next[s.id] = existing;
          continue;
        }
        const g = gradeMap.get(s.id);
        next[s.id] = g
          ? {
            tx1: formatScore(g.tx1),
            tx2: formatScore(g.tx2),
            tx3: formatScore(g.tx3),
            tx4: formatScore(g.tx4),
            gk: formatScore(g.gk),
            ck: formatScore(g.ck),
            note: g.note ?? "",
            comment: g.comment ?? "",
          }
          : { ...EMPTY_INPUT };
      }
      return next;
    });
  }, [students, grades, touched]);

  function updateField(
    studentId: string,
    field: keyof ScoreInput,
    value: string,
  ) {
    setTouched((prev) => new Set([...prev, studentId]));
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!students) return;

    const payload = [] as {
      studentId: string;
      tx1: number | null;
      tx2: number | null;
      tx3: number | null;
      tx4: number | null;
      gk: number | null;
      ck: number | null;
      note: string | null;
      comment: string | null;
    }[];

    for (const s of students) {
      const input = entries[s.id] ?? EMPTY_INPUT;
      const scores = parseInputScores(input);
      const row: (typeof payload)[number] = {
        studentId: s.id,
        ...scores,
        note: input.note.trim() || null,
        comment: input.comment.trim() || null,
      };

      const hasAnyScore =
        row.tx1 != null ||
        row.tx2 != null ||
        row.tx3 != null ||
        row.tx4 != null ||
        row.gk != null ||
        row.ck != null;
      if (!hasAnyScore) continue;

      const regularCount = [row.tx1, row.tx2, row.tx3, row.tx4].filter(
        (v) => v != null,
      ).length;
      if (regularCount < 2) {
        setMessage(
          `Học sinh ${s.studentCode} cần ít nhất 2 điểm thường xuyên`,
        );
        return;
      }

      payload.push(row);
    }

    startTransition(async () => {
      try {
        await save.mutateAsync({
          classId,
          subjectId,
          semester,
          grades: payload,
        });
        setTouched(new Set());
        setMessage("Đã lưu điểm");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Lỗi không xác định");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!students?.length) {
    return <p className="text-muted-foreground">Lớp chưa có học sinh.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{subjectName}</h2>
          <p className="text-sm text-muted-foreground">Học kỳ {semester}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportGradesForm
            classId={classId}
            subjectId={subjectId}
            semester={semester}
            students={students}
            entries={entries}
            onSuccess={() => setTouched(new Set())}
          />
          <Button type="submit" disabled={isPending || save.isPending}>
            <Save />
            {isPending ? "Đang lưu..." : "Lưu điểm"}
          </Button>
        </div>
      </div>

      {message && (
        <p
          className={
            message === "Đã lưu điểm"
              ? "text-sm text-green-500"
              : "text-sm text-destructive"
          }
        >
          {message}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">STT</TableHead>
              <TableHead>Mã HS</TableHead>
              <TableHead>Họ</TableHead>
              <TableHead>Tên</TableHead>
              {GRADE_SLOTS.map((slot) => (
                <TableHead
                  key={slot}
                  className="w-16 whitespace-pre-line text-center text-xs"
                >
                  {GRADE_SLOT_FULL_LABEL[slot].replace(" ", "\n")}
                </TableHead>
              ))}
              <TableHead className="w-24 text-center">Điểm TB</TableHead>
              <TableHead className="w-32">Ghi chú</TableHead>
              <TableHead className="w-48">Nhận xét</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s, index) => {
              const input = entries[s.id] ?? EMPTY_INPUT;
              const avg = calculateAverage(parseInputScores(input));
              return (
                <TableRow key={s.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{s.studentCode}</TableCell>
                  <TableCell>{s.lastName}</TableCell>
                  <TableCell>{s.firstName}</TableCell>
                  {GRADE_SLOTS.map((slot) => (
                    <TableCell key={slot} className="p-1">
                      <Label htmlFor={`${slot}-${s.id}`} className="sr-only">
                        {GRADE_SLOT_FULL_LABEL[slot]} {s.studentCode}
                      </Label>
                      <Input
                        id={`${slot}-${s.id}`}
                        type="text"
                        inputMode="decimal"
                        value={input[slot]}
                        onChange={(e) =>
                          updateField(s.id, slot, e.target.value)
                        }
                        className="h-7 w-16 text-center"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-medium">
                    {avg ?? "—"}
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      value={input.note}
                      onChange={(e) => updateField(s.id, "note", e.target.value)}
                      placeholder="Ghi chú"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      value={input.comment}
                      onChange={(e) => updateField(s.id, "comment", e.target.value)}
                      placeholder="Nhận xét"
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </form>
  );
}
