"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
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
import { useImportGrades } from "@hooks";

interface ImportGradesFormProps {
  classId: string;
  subjectId: string;
  semester: number;
  onSuccess?: () => void;
}

export function ImportGradesForm({
  classId,
  subjectId,
  semester,
  onSuccess,
}: ImportGradesFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const importGrades = useImportGrades(classId, subjectId, semester);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setIsError(true);
      setMessage("Chọn file CSV");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("classId", classId);
      fd.set("subjectId", subjectId);
      fd.set("semester", String(semester));
      fd.set("file", file);

      try {
        const result = await importGrades.mutateAsync(fd);
        setIsError(false);
        setMessage(`Đã nhập ${result.inserted} học sinh, bỏ qua ${result.skipped} dòng`);
        if (fileRef.current) fileRef.current.value = "";
        onSuccess?.();
        setTimeout(() => setOpen(false), 1000);
      } catch (err) {
        setIsError(true);
        setMessage(err instanceof Error ? err.message : "Lỗi không xác định");
      }
    });
  };

  function downloadTemplate() {
    const rows = [
      "maHS,tx1,tx2,tx3,tx4,gk,ck,ghiChu,nhanXet",
      "HS001,8,8.5,,,7.5,8,,",
      "HS002,7,7.5,8,,8,9,,",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_import_diem.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <FileUp /> Import CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import điểm</DialogTitle>
            <DialogDescription>
              Tải lên file CSV theo mẫu: maHS,tx1,tx2,tx3,tx4,gk,ck,ghiChu,nhanXet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">File CSV</Label>
              <Input
                id="csv"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                required
              />
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
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                Tải mẫu CSV
              </Button>
              <Button type="submit" disabled={isPending || importGrades.isPending}>
                {isPending ? "Đang import..." : "Import"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
