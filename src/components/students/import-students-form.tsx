"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importStudents } from "@lib/actions";

interface ImportStudentsFormProps {
  classId: string;
}

export function ImportStudentsForm({ classId }: ImportStudentsFormProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      fd.set("file", file);

      const result = await importStudents(fd);
      setIsError(!result.success);
      setMessage(
        result.success
          ? `Đã import ${result.data.inserted} học sinh`
          : result.error,
      );
      if (result.success) {
        if (fileRef.current) fileRef.current.value = "";
        await queryClient.invalidateQueries({
          queryKey: ["students", classId],
        });
      }
    });
  };

  function downloadTemplate() {
    const rows = [
      "maHS,ho,ten,ngay-sinh",
      "HS001,Nguyễn Văn,An,2010-03-15",
      "HS002,Trần Thị,Bình,03/15/2010",
      "HS003,Lê Hoàng,Cường,",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_import_hoc_sinh.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="csv">Import CSV (maHS,ho,ten,yyyy-mm-dd)</Label>
        <Input id="csv" ref={fileRef} type="file" accept=".csv,text/csv" />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Đang import..." : "Import"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={downloadTemplate}
      >
        Tải mẫu CSV
      </Button>
      {message && (
        <p
          className={
            isError ? "text-sm text-destructive" : "text-sm text-green-500"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
