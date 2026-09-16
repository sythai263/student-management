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
import { toast } from "sonner";
import { useImportGrades } from "@hooks";
import { friendlyErrorMessage } from "@lib/utils";
import type { ImportGradesSummary } from "@lib/actions";
import type { Student } from "@types";

interface ScoreInput {
  tx1: string;
  tx2: string;
  tx3: string;
  tx4: string;
  gk: string;
  ck: string;
  note: string;
  comment: string;
}

interface ImportGradesFormProps {
  classId: string;
  subjectId: string;
  semester: number;
  students: Student[];
  entries: Record<string, ScoreInput>;
  onSuccess?: () => void;
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ImportGradesForm({
  classId,
  subjectId,
  semester,
  students,
  entries,
  onSuccess,
}: ImportGradesFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<ImportGradesSummary["errors"]>([]);
  const [isPending, startTransition] = useTransition();
  const importGrades = useImportGrades(classId, subjectId, semester);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn tệp điểm");
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
        const summary =
          "Đã nhập " + result.inserted + " học sinh, bỏ qua " + result.skipped + " dòng";
        if (result.inserted === 0 && result.errors.length > 0) {
          toast.error(summary);
        } else {
          toast.success(summary);
        }
        setErrors(result.errors);
        if (result.inserted > 0) {
          if (fileRef.current) fileRef.current.value = "";
          onSuccess?.();
        }
        if (result.errors.length === 0) {
          setOpen(false);
        }
      } catch (err) {
        toast.error(friendlyErrorMessage(err));
        setErrors([]);
      }
    });
  };

  function downloadTemplate() {
    const header = "Mã HS,Họ tên,TX1,TX2,TX3,TX4,GK,CK,Ghi chú,Nhận xét";
    const rows = students.map((s) => {
      const fullName = `${s.lastName} ${s.firstName}`;
      const input = entries[s.id] ?? {
        tx1: "",
        tx2: "",
        tx3: "",
        tx4: "",
        gk: "",
        ck: "",
        note: "",
        comment: "",
      };
      return [
        csvCell(s.studentCode ?? ""),
        csvCell(fullName),
        input.tx1,
        input.tx2,
        input.tx3,
        input.tx4,
        input.gk,
        input.ck,
        csvCell(input.note),
        csvCell(input.comment),
      ].join(",");
    });
    const blob = new Blob([header + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_bang_diem.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <FileUp /> Nhập điểm từ tệp
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập điểm từ tệp</DialogTitle>
            <DialogDescription>
              Chọn tệp điểm (.csv) theo đúng mẫu tải xuống bên dưới. Mỗi học
              sinh cần ít nhất 2 điểm thường xuyên.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">Tệp điểm (.csv)</Label>
              <Input
                id="csv"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                required
              />
            </div>
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
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
                disabled={students.length === 0}
              >
                Tải tệp mẫu
              </Button>
              <Button type="submit" disabled={isPending || importGrades.isPending}>
                {isPending ? "Đang nhập..." : "Nhập điểm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
