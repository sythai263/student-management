"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { createSubject } from "@lib/actions";

export function CreateSubjectForm() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      code: (form.elements.namedItem("code") as HTMLInputElement).value,
    };

    startTransition(async () => {
      const result = await createSubject(input);
      setError(result.success ? null : result.error);
      if (result.success) {
        formRef.current?.reset();
        await queryClient.invalidateQueries({ queryKey: ["subjects"] });
        setOpen(false);
      }
    });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus /> Tạo môn học
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo môn học</DialogTitle>
            <DialogDescription>
              Môn học sẽ được tái sử dụng cho nhiều lớp.
            </DialogDescription>
          </DialogHeader>
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject-name">Tên môn học</Label>
              <Input
                id="subject-name"
                name="name"
                placeholder="Toán"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject-code">Mã môn</Label>
              <Input id="subject-code" name="code" placeholder="MATH" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang tạo..." : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
