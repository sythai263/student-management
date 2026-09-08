"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClass } from "@lib/actions";

export function CreateClassForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      schoolYear: (form.elements.namedItem("schoolYear") as HTMLInputElement)
        .value,
    };

    startTransition(async () => {
      const result = await createClass(input);
      setError(result.success ? null : result.error);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex items-end gap-3"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Tên lớp</Label>
        <Input id="name" name="name" placeholder="10A1" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="schoolYear">Năm học</Label>
        <Input
          id="schoolYear"
          name="schoolYear"
          placeholder="2025-2026"
          required
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang tạo..." : "Tạo lớp"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
