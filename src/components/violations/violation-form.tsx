"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateViolations, useStudents } from "@hooks";
import { removeDiacritics, studentFullName } from "@lib/string";
import type { Student } from "@types";

const VIOLATION_PRESETS = [
  "Bỏ tiết",
  "Đi muộn",
  "Nói chuyện riêng",
  "Không ghi bài",
  "Đánh nhau",
];

/** Current time formatted for a `datetime-local` input. */
function nowForInput(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Split free text into items so preset chips never append duplicates. */
function contentItems(content: string): string[] {
  return content
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

interface ViolationFormProps {
  classId: string;
}

export function ViolationForm({ classId }: ViolationFormProps) {
  const { data: students } = useStudents(classId);
  const createMutation = useCreateViolations(classId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowForInput());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const q = removeDiacritics(query.trim());
    if (!q) return [];
    const selectedIds = new Set(selected.map((s) => s.id));
    return (students ?? [])
      .filter((s) => !selectedIds.has(s.id))
      .filter((s) =>
        removeDiacritics(
          `${s.lastName} ${s.firstName} ${s.studentCode ?? ""} ${s.nameSuffix ?? ""}`,
        ).includes(q),
      )
      .slice(0, 8);
  }, [query, students, selected]);

  const openDialog = () => {
    setSelected([]);
    setQuery("");
    setContent("");
    setRecordedAt(nowForInput());
    setOpen(true);
  };

  const addStudent = (s: Student) => {
    setSelected((prev) => [...prev, s]);
    setQuery("");
    setShowSuggestions(true);
  };

  const removeStudent = (id: string) =>
    setSelected((prev) => prev.filter((s) => s.id !== id));

  const items = contentItems(content);
  const appendPreset = (preset: string) => {
    if (items.includes(preset.toLowerCase())) return;
    setContent((prev) => (prev.trim() ? `${prev.trim()}, ${preset}` : preset));
  };

  const submit = () => {
    if (selected.length === 0) {
      toast.error("Chọn ít nhất một học sinh");
      return;
    }
    if (!content.trim()) {
      toast.error("Nội dung vi phạm không được trống");
      return;
    }
    if (Number.isNaN(Date.parse(recordedAt))) {
      toast.error("Ngày giờ không hợp lệ");
      return;
    }
    createMutation.mutate(
      {
        studentIds: selected.map((s) => s.id),
        content: content.trim(),
        recordedAt: new Date(recordedAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(`Đã ghi nhận vi phạm cho ${selected.length} học sinh`);
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <>
      <Button type="button" onClick={openDialog}>
        <Plus /> Thêm lỗi vi phạm
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ghi nhận vi phạm</DialogTitle>
            <DialogDescription>
              Tìm và thêm học sinh vi phạm nội quy lớp học.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="violation-student">Học sinh vi phạm</Label>
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1">
                      {studentFullName(s)}
                      {s.studentCode ? ` (${s.studentCode})` : ""}
                      <button
                        type="button"
                        aria-label={`Bỏ ${studentFullName(s)}`}
                        className="ml-0.5 rounded-full hover:text-destructive"
                        onClick={() => removeStudent(s.id)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Input
                  id="violation-student"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 150)
                  }
                  placeholder="Gõ họ tên hoặc mã học sinh để tìm..."
                  autoComplete="off"
                />
                {showSuggestions && query.trim() && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addStudent(s);
                          }}
                        >
                          {studentFullName(s)}
                          {s.studentCode ? (
                            <span className="ml-1 text-muted-foreground">
                              ({s.studentCode})
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                    {suggestions.length === 0 && (
                      <li className="px-3 py-2 text-sm text-muted-foreground">
                        Không tìm thấy học sinh.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="violation-content">Lỗi vi phạm</Label>
              <div className="flex flex-wrap gap-1.5">
                {VIOLATION_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={items.includes(preset.toLowerCase())}
                    onClick={() => appendPreset(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
              <Textarea
                id="violation-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung vi phạm..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="violation-time">Thời điểm ghi nhận</Label>
              <Input
                id="violation-time"
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={submit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Đang lưu..." : "Ghi nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
