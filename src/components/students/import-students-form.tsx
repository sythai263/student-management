"use client";

import { useRef, useState, useTransition } from "react";
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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="csv">Import CSV (maHS,ho,ten)</Label>
        <Input id="csv" ref={fileRef} type="file" accept=".csv,text/csv" />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Đang import..." : "Import"}
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
