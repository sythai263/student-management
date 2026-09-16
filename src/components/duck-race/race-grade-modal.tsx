"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { GRADE_SLOT_LABEL } from "@constants";
import { getGradeForRace, saveRaceGrades } from "@lib/actions";
import { parseScoreInput } from "@lib/grade-utils";
import { friendlyErrorMessage } from "@lib/utils";
import type { GradeSlot } from "@constants";

interface RaceGradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  subjectId?: string;
  studentId?: string;
  studentName?: string;
}

export function RaceGradeModal({
  open,
  onOpenChange,
  classId,
  subjectId,
  studentId,
  studentName,
}: RaceGradeModalProps) {
  const [semester, setSemester] = useState(1);
  const [targetSlot, setTargetSlot] = useState<GradeSlot | null>(null);
  const [value, setValue] = useState("");
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [loadFailed, setLoadFailed] = useState(false);

  // Reset the form whenever the modal target changes; the grade lookup
  // itself lives in the effect below.
  const fetchKey = `${open}|${classId}|${subjectId}|${studentId}|${semester}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey);
    setLoadFailed(false);
    setValue("");
    if (!open || !subjectId || !studentId) setTargetSlot(null);
  }

  useEffect(() => {
    if (!open || !subjectId || !studentId) return;
    startLoading(async () => {
      try {
        const res = await getGradeForRace({
          classId,
          subjectId,
          semester,
          studentId,
        });
        if (res.success) {
          setTargetSlot(res.data.emptySlots[0] ?? null);
        } else {
          setLoadFailed(true);
          setTargetSlot(null);
          toast.error(res.error);
        }
      } catch (e) {
        setLoadFailed(true);
        toast.error(friendlyErrorMessage(e));
      }
    });
  }, [open, classId, subjectId, studentId, semester]);

  function handleSave() {
    if (!subjectId || !studentId) {
      toast.error("Thiếu thông tin môn học hoặc học sinh");
      return;
    }
    if (!targetSlot) {
      toast.error("Học sinh đã có đủ 4 điểm thường xuyên");
      return;
    }

    const trimmed = value.trim();
    if (trimmed === "") {
      toast.error("Chưa nhập điểm");
      return;
    }

    const { value: parsed, invalid } = parseScoreInput(trimmed);
    if (invalid || parsed == null) {
      toast.error(`Điểm "${trimmed}" không hợp lệ (0 - 10)`);
      return;
    }

    startSaving(async () => {
      const result = await saveRaceGrades({
        classId,
        subjectId,
        semester,
        studentId,
        scores: [parsed],
      });
      if (result.success) {
        toast.success("Đã lưu điểm");
        onOpenChange(false);
        setValue("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nhập điểm kiểm tra bài</DialogTitle>
          <DialogDescription>
            {studentName ? `Học sinh: ${studentName}` : "Học sinh được chọn"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="race-grade-semester">Học kỳ</Label>
            <Select
              value={String(semester)}
              onValueChange={(v) => {
                setSemester(Number(v));
                setValue("");
              }}
              disabled={loading || saving}
            >
              <SelectTrigger id="race-grade-semester">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Học kỳ 1</SelectItem>
                <SelectItem value="2">Học kỳ 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!subjectId ? (
            <p className="text-sm text-destructive">
              Thiếu môn học. Vui lòng quay lại chọn môn trước khi chạy đua.
            </p>
          ) : loading ? (
            <Skeleton className="h-9 w-full" />
          ) : loadFailed ? null : !targetSlot ? (
            <p className="text-sm text-muted-foreground">
              Học sinh đã có đủ 4 điểm thường xuyên cho môn này.
            </p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="race-grade-score">
                Điểm {GRADE_SLOT_LABEL[targetSlot]}
              </Label>
              <Input
                id="race-grade-score"
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={saving}
                className="text-center"
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X /> Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!targetSlot || loading || saving || !subjectId}
          >
            <Save />
            {saving ? "Đang lưu..." : "Lưu điểm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
