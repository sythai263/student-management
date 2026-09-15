"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
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
import { importStudents } from "@lib/actions";
import { useClass } from "@hooks";

interface ImportStudentsFormProps {
  classId: string;
}

export function ImportStudentsForm({ classId }: ImportStudentsFormProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { data: classData } = useClass(classId);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setIsError(true);
      setMessage("Vui lòng chọn tệp danh sách học sinh");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("classId", classId);
      fd.set("file", file);

      const result = await importStudents(fd);
      setIsError(!result.success);
      setMessage(
        result.success
          ? `Đã thêm ${result.data.inserted}, cập nhật ${result.data.updated} học sinh`
          : result.error,
      );
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
            </div>
            {message && (
              <p
                className={
                  isError ? "text-sm text-destructive" : "text-sm text-green-500"
                }
              >
                {message}
              </p>
            )}
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
