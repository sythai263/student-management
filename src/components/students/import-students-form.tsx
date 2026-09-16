"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { importStudents } from "@lib/actions";
import { useClass } from "@hooks";

interface ImportStudentsFormProps {
  classId: string;
}

export function ImportStudentsForm({ classId }: ImportStudentsFormProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [matchBy, setMatchBy] = useState<"code" | "name">("code");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [isPending, startTransition] = useTransition();
  const { data: classData } = useClass(classId);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn tệp danh sách học sinh");
      return;
    }

    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      fd.set("classId", classId);
      fd.set("file", file);
      fd.set("matchBy", matchBy);
      fd.set("importMode", importMode);

      const result = await importStudents(fd);
      if (result.success) {
        const { inserted, updated, deleted } = result.data;
        toast.success(
          `Đã thêm ${inserted}, cập nhật ${updated}` +
          (deleted > 0 ? `, xóa ${deleted}` : "") +
          " học sinh",
        );
      } else {
        toast.error(result.error);
      }
      if (result.success) {
        if (fileRef.current) fileRef.current.value = "";
        await queryClient.invalidateQueries({
          queryKey: ["students", classId],
        });
        setOpen(false);
      }
    });
  };

  function downloadTemplate() {
    const rows = [
      "Mã HS,Họ đệm,Tên,Ngày sinh",
      "HS001,Nguyễn Văn,An,2010-03-15",
      "HS002,Trần Thị,Bình,03/15/2010",
      "HS003,Lê Hoàng,Cường,",
      ",Phạm Minh,Đức,2010-01-20",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_danh_sach_hoc_sinh.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <FileUp /> Thêm học sinh từ tệp
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm học sinh từ tệp</DialogTitle>
            <DialogDescription>
              {classData
                ? `Lớp: ${classData.name} (${classData.classCode}) - Năm học ${classData.schoolYear}`
                : "Tải lên tệp danh sách để thêm nhiều học sinh cùng lúc"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">Tệp danh sách học sinh (.csv)</Label>
              <Input id="csv" ref={fileRef} type="file" accept=".csv,text/csv" />
              <p className="text-xs text-muted-foreground">
                Cột Mã HS có thể để trống.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-by">Kiểm tra trùng theo</Label>
              <Select
                value={matchBy}
                onValueChange={(v) => setMatchBy(v as "code" | "name")}
              >
                <SelectTrigger id="match-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Mã học sinh</SelectItem>
                  <SelectItem value="name">Họ và tên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-mode">Chế độ nhập</Label>
              <Select
                value={importMode}
                onValueChange={(v) => setImportMode(v as "append" | "replace")}
              >
                <SelectTrigger id="import-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">
                    Thêm vào danh sách hiện có
                  </SelectItem>
                  <SelectItem value="replace">
                    Thay thế toàn bộ danh sách
                  </SelectItem>
                </SelectContent>
              </Select>
              {importMode === "replace" && (
                <p className="text-xs text-destructive">
                  Học sinh không có trong tệp sẽ bị xóa khỏi lớp cùng toàn bộ
                  điểm danh và điểm số.
                </p>
              )}
            </div>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox name="addToAllSessions" />
              Thêm học sinh mới vào tất cả buổi điểm danh
            </Label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
              >
                Tải tệp mẫu
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang thêm..." : "Thêm vào lớp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
