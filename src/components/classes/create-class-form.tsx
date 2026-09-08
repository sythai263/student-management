"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClass } from "@lib/actions";

export function CreateClassForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = {
      classCode: (form.elements.namedItem("classCode") as HTMLInputElement)
        .value,
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      schoolYear: (form.elements.namedItem("schoolYear") as HTMLInputElement)
        .value,
    };

    startTransition(async () => {
      const result = await createClass(input);
      setError(result.success ? null : result.error);
      if (result.success) {
        formRef.current?.reset();
        await queryClient.invalidateQueries({ queryKey: ["classes"] });
        setOpen(false);
        router.push(`/classes/${result.data.id}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button type="button">Tạo lớp mới</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo lớp mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin lớp học để bắt đầu quản lý.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classCode">Mã lớp</Label>
            <Input
              id="classCode"
              name="classCode"
              placeholder="10A1"
              required
            />
          </div>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang tạo..." : "Tạo lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
