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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSchools } from "@hooks";
import { assignSubjectToClass, createClass } from "@lib/actions";

const NO_SCHOOL = "__none__";

interface CreateClassFormProps {
  subjectId?: string;
}

export function CreateClassForm({ subjectId }: CreateClassFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const { data: schools } = useSchools();
  const [open, setOpen] = useState(false);
  const [schoolId, setSchoolId] = useState(NO_SCHOOL);
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
      schoolId: schoolId === NO_SCHOOL ? undefined : schoolId,
    };

    startTransition(async () => {
      const result = await createClass(input);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      let redirectPath = `/classes/${result.data.id}`;

      if (subjectId) {
        const assign = await assignSubjectToClass({
          classId: result.data.id,
          subjectId,
        });
        if (!assign.success) {
          toast.error(assign.error);
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: ["class-subjects", result.data.id],
        });
        redirectPath = `/classes/${result.data.id}?subjectId=${subjectId}`;
      }

      formRef.current?.reset();
      setSchoolId(NO_SCHOOL);
      toast.success("Đã tạo lớp mới");
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
            <div className="space-y-2">
              <Label htmlFor="school">Trường</Label>
              <Select value={schoolId} onValueChange={(v) => setSchoolId(v ?? NO_SCHOOL)}>
                <SelectTrigger id="school">
                  <SelectValue placeholder="Không gắn trường">
                    {(value: string) =>
                      value === NO_SCHOOL
                        ? "Không gắn trường"
                        : (schools?.find((s) => s.id === value)?.name ??
                          "Không gắn trường")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SCHOOL}>Không gắn trường</SelectItem>
                  {(schools ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!schools?.length && (
                <p className="text-xs text-muted-foreground">
                  Chưa có trường nào — thêm trong menu tài khoản → Trường
                  giảng dạy.
                </p>
              )}
            </div>
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
