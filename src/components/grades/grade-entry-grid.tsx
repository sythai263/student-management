"use client";

import { useEffect, useState, useTransition, type FormEventHandler } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { useStudents, useSaveGrades, useGrades, useCloseGradeSession } from "@hooks";
import type { GradeWithStudent } from "@hooks";

interface GradeEntryGridProps {
  classId: string;
  sessionId: string;
  closed: boolean;
}

interface GradeInput {
  score: string;
  note: string;
}

export function GradeEntryGrid({ classId, sessionId, closed }: GradeEntryGridProps) {
  const router = useRouter();
  const { data: students, isLoading: studentsLoading } = useStudents(classId);
  const { data: grades, isLoading: gradesLoading } = useGrades(sessionId);
  const save = useSaveGrades(sessionId);
  const close = useCloseGradeSession(sessionId);
  const [entries, setEntries] = useState<Record<string, GradeInput>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!students || grades === undefined) return;
    const gradeMap = new Map<string, GradeWithStudent>();
    grades.forEach((g) => {
      if (g.students?.studentCode) {
        gradeMap.set(g.students.studentCode, g);
      }
    });
    setEntries((prev) => {
      const next: Record<string, GradeInput> = {};
      for (const s of students) {
        const existing = prev[s.studentCode];
        if (touched.has(s.studentCode)) {
          next[s.studentCode] = existing ?? { score: "", note: "" };
        } else {
          const g = gradeMap.get(s.studentCode);
          next[s.studentCode] = {
            score: g ? String(g.score) : existing?.score ?? "",
            note: g?.note ?? existing?.note ?? "",
          };
        }
      }
      return next;
    });
  }, [students, grades, touched]);

  const isLoading = studentsLoading || gradesLoading;

  const handleScoreChange = (code: string, value: string) => {
    setTouched((prev) => new Set([...prev, code]));
    setEntries((prev) => ({
      ...prev,
      [code]: { ...prev[code], score: value },
    }));
  };

  const handleNoteChange = (code: string, value: string) => {
    setTouched((prev) => new Set([...prev, code]));
    setEntries((prev) => ({
      ...prev,
      [code]: { ...prev[code], note: value },
    }));
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!students) return;

    const payload = [] as { studentId: string; score: number; note?: string }[];
    for (const s of students) {
      const input = entries[s.studentCode];
      const score = input?.score.trim();
      if (score === undefined || score === "") continue;
      const parsed = Number(score.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 10) {
        setMessage(`Điểm không hợp lệ tại HS ${s.studentCode}`);
        return;
      }
      payload.push({
        studentId: s.id,
        score: parsed,
        note: input.note?.trim() || undefined,
      });
    }

    startTransition(async () => {
      try {
        await save.mutateAsync({ gradeSessionId: sessionId, grades: payload });
        setMessage("Đã lưu điểm");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Lỗi không xác định");
      }
    });
  };

  const handleClose = () => {
    if (!confirm("Đóng đợt kiểm tra sẽ không thể sửa điểm nữa. Tiếp tục?")) return;
    startTransition(async () => {
      await close.mutateAsync();
      router.refresh();
    });
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (!students?.length) {
    return <p className="text-muted-foreground">Lớp chưa có học sinh.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        {closed ? (
          <Badge variant="secondary">Đã đóng</Badge>
        ) : (
          <Badge>Đang mở</Badge>
        )}
        <div className="flex gap-2">
          {!closed && (
            <Button type="submit" disabled={isPending || save.isPending}>
              <Save />
              {isPending ? "Đang lưu..." : "Lưu điểm"}
            </Button>
          )}
          {!closed && (
            <Button type="button" variant="outline" onClick={handleClose} disabled={close.isPending}>
              {close.isPending ? "Đang đóng..." : "Đóng đợt"}
            </Button>
          )}
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">STT</TableHead>
            <TableHead>Mã HS</TableHead>
            <TableHead>Họ</TableHead>
            <TableHead>Tên</TableHead>
            <TableHead className="w-32">Điểm</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s, index) => (
            <TableRow key={s.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{s.studentCode}</TableCell>
              <TableCell>{s.lastName}</TableCell>
              <TableCell>{s.firstName}</TableCell>
              <TableCell>
                <Label htmlFor={`score-${s.id}`} className="sr-only">
                  Điểm {s.studentCode}
                </Label>
                <Input
                  id={`score-${s.id}`}
                  type="text"
                  inputMode="decimal"
                  value={entries[s.studentCode]?.score ?? ""}
                  onChange={(e) => handleScoreChange(s.studentCode, e.target.value)}
                  disabled={closed}
                  placeholder="0-10"
                  className="h-8"
                />
              </TableCell>
              <TableCell>
                <Label htmlFor={`note-${s.id}`} className="sr-only">
                  Ghi chú {s.studentCode}
                </Label>
                <Input
                  id={`note-${s.id}`}
                  value={entries[s.studentCode]?.note ?? ""}
                  onChange={(e) => handleNoteChange(s.studentCode, e.target.value)}
                  disabled={closed}
                  placeholder="Ghi chú"
                  className="h-8"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </form>
  );
}
