"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { studentFullName } from "@lib/string";

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
  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowForInput());

  const openDialog = () => {
    setSelected([]);
    setContent("");
    setRecordedAt(nowForInput());
    setOpen(true);
  };

  const toggleStudent = (id: string, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((s) => s !== id),
    );

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
        studentIds: selected,
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
              Chọn học sinh vi phạm nội quy lớp học.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Học sinh vi phạm</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {(students ?? []).map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.includes(s.id)}
                      onCheckedChange={(checked) =>
                        toggleStudent(s.id, checked === true)
                      }
                    />
                    {studentFullName(s)}
                    {s.studentCode ? (
                      <span className="text-muted-foreground">
                        ({s.studentCode})
                      </span>
                    ) : null}
                  </label>
                ))}
                {students?.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    Lớp chưa có học sinh nào.
                  </p>
                ) : null}
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
