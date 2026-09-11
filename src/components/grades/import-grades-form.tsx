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
import type { ImportGradesSummary } from "@lib/actions";

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
  const [errors, setErrors] = useState<ImportGradesSummary["errors"]>([]);
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
        setIsError(result.inserted === 0 && result.errors.length > 0);
        setMessage("Đã nhập " + result.inserted + " học sinh, bỏ qua " + result.skipped + " dòng");
        setErrors(result.errors);
        if (result.inserted > 0) {
          if (fileRef.current) fileRef.current.value = "";
          onSuccess?.();
        }
        if (result.errors.length === 0) {
          setTimeout(() => setOpen(false), 1000);
        }
      } catch (err) {
        setIsError(true);
        setMessage(err instanceof Error ? err.message : "Lỗi không xác định");
        setErrors([]);
      }
    });
  };

  function downloadTemplate() {
    const header = "maHS,Họ tên,TX1,TX2,TX3,TX4,GK,CK,Ghi chú,Nhận xét";
    const sample = [
      "HS001,Nguyễn Văn A,8,8.5,,,7.5,8,,",
      "HS002,Trần Thị B,7,7.5,8,,8,9,,",
      "HS003,Lê Văn C,,,,,9,8.5,Đã nộp muộn,Cần cố gắng",
    ];
    const blob = new Blob([header + "\n" + sample.join("\n")], { type: "text/csv;charset=utf-8;" });
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
              File CSV hỗ trợ tiêu đề tiếng Việt/không dấu, dấu phẩy/ dấu chấm phẩy,
              dấu phẩy/chấm thập phân. Mỗi HS cần ít nhất 2 điểm TX.
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
                  isError ? "text-sm text-destructive" : "text-sm text-green-600"
                }
              >
                {message}
              </p>
            )}
            {errors.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-destructive/30 bg-destructive/5 p-2 text-xs">
                <p className="mb-1 font-semibold text-destructive">Các dòng lỗi:</p>
                <ul className="space-y-1">
                  {errors.map((e, i) => (
                    <li key={i}>
                      Dòng {e.lineNo} {e.studentCode ? "(" + e.studentCode + ")" : ""}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
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
