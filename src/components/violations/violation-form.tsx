"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "../ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
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
  const [content, setContent] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowForInput());
  const studentAnchor = useComboboxAnchor();

  // Diacritic-insensitive search on name + code; already-picked students
  // stay out of the suggestion list.
  const studentFilter = (s: Student, q: string) =>
    !selected.some((v) => v.id === s.id) &&
    removeDiacritics(
      `${s.lastName} ${s.firstName} ${s.studentCode ?? ""} ${s.nameSuffix ?? ""}`,
    ).includes(removeDiacritics(q.trim()));

  const openDialog = () => {
    setSelected([]);
    setContent("");
    setRecordedAt(nowForInput());
    setOpen(true);
  };

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
              <Combobox
                multiple
                items={students ?? []}
                value={selected}
                onValueChange={setSelected}
                isItemEqualToValue={(a, b) => a.id === b.id}
                itemToStringLabel={studentFullName}
                filter={studentFilter}
                autoHighlight
                limit={8}
                autoComplete="off"
              >
                <ComboboxChips ref={studentAnchor}>
                  <ComboboxValue>
                    {(values: Student[]) => (
                      <>
                        {values.map((s) => (
                          <ComboboxChip key={s.id}>
                            {studentFullName(s)}
                            {s.studentCode ? ` (${s.studentCode})` : ""}
                          </ComboboxChip>
                        ))}
                      </>
                    )}
                  </ComboboxValue>
                  <ComboboxChipsInput
                    id="violation-student"
                    placeholder="Gõ họ tên hoặc mã học sinh để tìm..."
                  />
                </ComboboxChips>
                <ComboboxContent anchor={studentAnchor}>
                  <ComboboxEmpty>Không tìm thấy học sinh.</ComboboxEmpty>
                  <ComboboxList>
                    {(s: Student) => (
                      <ComboboxItem key={s.id} value={s}>
                        {studentFullName(s)}
                        {s.studentCode ? (
                          <span className="ml-1 text-muted-foreground">
                            ({s.studentCode})
                          </span>
                        ) : null}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
