"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { registerStudent } from "@lib/actions";
import { compressImage, uploadDirect } from "@lib/image";

interface RegisterStudentFormProps {
  classId: string;
}

export function RegisterStudentForm({ classId }: RegisterStudentFormProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("image") as HTMLInputElement;
    const file = fileInput.files?.[0];
    const studentCode = (
      form.elements.namedItem("studentCode") as HTMLInputElement
    ).value;

    startTransition(async () => {
      const fd = new FormData(form);
      fd.delete("image");
      // Original + compressed copy are uploaded directly to storage
      // from the browser — a Server Action body must stay well under
      // Vercel's 4.5MB request limit.
      if (file) {
        const [imageKey, avatarKey] = await Promise.all([
          uploadDirect("student-original", classId, studentCode, file),
          uploadDirect(
            "student-display",
            classId,
            studentCode,
            await compressImage(file),
          ),
        ]);
        fd.set("imageKey", imageKey);
        fd.set("avatarKey", avatarKey);
      }
      fd.set("classId", classId);

      const result = await registerStudent(fd);
      setIsError(!result.success);
      setMessage(
        result.success ? "Đăng ký học sinh thành công" : result.error,
      );
      if (result.success) {
        formRef.current?.reset();
        await queryClient.invalidateQueries({
          queryKey: ["students", classId],
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng ký học sinh</CardTitle>
        <CardDescription>
          Ảnh chân dung không bắt buộc — nếu có sẽ được dùng để điểm danh
          bằng khuôn mặt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentCode">Mã HS</Label>
              <Input id="studentCode" name="studentCode" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Ngày sinh</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Họ & tên đệm</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Tên</Label>
              <Input id="firstName" name="firstName" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Ảnh chân dung (không bắt buộc)</Label>
            <Input id="image" name="image" type="file" accept="image/*" />
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
          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang xử lý..." : "Đăng ký"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
