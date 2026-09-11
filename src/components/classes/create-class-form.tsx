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
} from "@/components/ui/dialog";
import { assignSubjectToClass, createClass } from "@lib/actions";

interface CreateClassFormProps {
  subjectId?: string;
}

export function CreateClassForm({ subjectId }: CreateClassFormProps) {
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
      if (!result.success) {
        setError(result.error);
        return;
      }

      let redirectPath = `/classes/${result.data.id}`;

      if (subjectId) {
        const assign = await assignSubjectToClass({
          classId: result.data.id,
          subjectId,
        });
        if (!assign.success) {
          setError(assign.error);
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: ["class-subjects", result.data.id],
        });
        redirectPath = `/classes/${result.data.id}?subjectId=${subjectId}`;
      }

      formRef.current?.reset();
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      setOpen(false);
      router.push(redirectPath);
    });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {subjectId ? "Tạo lớp cho môn này" : "Tạo lớp mới"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subjectId ? "Tạo lớp cho môn này" : "Tạo lớp mới"}
            </DialogTitle>
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
    </>
  );
}
