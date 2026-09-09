"use client";

import { useState, useTransition, type SubmitEventHandler } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateGradeSession, useSubjects } from "@hooks";
import { SCORE_TYPES, SCORE_TYPE_LABEL } from "@constants";

interface GradeActionsProps {
  classId: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function GradeActions({ classId }: GradeActionsProps) {
  const router = useRouter();
  const { data: subjects, isLoading } = useSubjects();
  const createSession = useCreateGradeSession(classId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [subjectId, setSubjectId] = useState("");
  const [scoreType, setScoreType] = useState<string>(SCORE_TYPES[0]);
  const [semester, setSemester] = useState("1");
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState("1");

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createSession.mutateAsync({
          classId,
          subjectId,
          semester: Number(semester),
          scoreType,
          name,
          date,
          weight: Number(weight),
        });
        setOpen(false);
        router.push(`/classes/${classId}/grades/${result.id}`);
      } catch {
        // Error is surfaced via createSession.error below.
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đợt kiểm tra</CardTitle>
        <CardDescription>Tạo đợt kiểm tra mới để nhập điểm</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          <BookOpen /> Tạo đợt kiểm tra
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo đợt kiểm tra</DialogTitle>
            <DialogDescription>
              Chọn môn học, loại điểm và tên đợt kiểm tra.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Môn học</Label>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : !subjects?.length ? (
                <p className="text-sm text-destructive">
                  Chưa có môn học. Vui lòng tạo môn học trước.
                </p>
              ) : (
                <Select
                  value={subjectId}
                  onValueChange={(v) => setSubjectId(v ?? "")}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="score-type">Loại điểm</Label>
                <Select
                  value={scoreType}
                  onValueChange={(v) => setScoreType(v ?? SCORE_TYPES[0])}
                >
                  <SelectTrigger id="score-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SCORE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Học kỳ</Label>
                <Select
                  value={semester}
                  onValueChange={(v) => setSemester(v ?? "1")}
                >
                  <SelectTrigger id="semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Học kỳ {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="round-name">Tên đợt kiểm tra</Label>
              <Input
                id="round-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Kiểm tra miệng tuần 3"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="round-date">Ngày</Label>
                <Input
                  id="round-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Hệ số</Label>
                <Input
                  id="weight"
                  type="number"
                  min={1}
                  max={10}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {createSession.error && (
              <p className="text-sm text-destructive">
                {createSession.error.message}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || !subjectId || !name || subjects?.length === 0}
              >
                {isPending ? "Đang tạo..." : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
