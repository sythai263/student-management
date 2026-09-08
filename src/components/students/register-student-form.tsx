"use client";

import { useRef, useState, useTransition } from "react";
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
import { compressImage } from "@lib/image";

interface RegisterStudentFormProps {
  classId: string;
}

export function RegisterStudentForm({ classId }: RegisterStudentFormProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("image") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setIsError(true);
      setMessage("Chọn ảnh chân dung");
      return;
    }

    startTransition(async () => {
      // Client compresses the image before calling the Server Action.
      const compressed = await compressImage(file);
      const fd = new FormData(form);
      fd.set("image", compressed);
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
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng ký học sinh</CardTitle>
        <CardDescription>
          Ảnh chân dung sẽ được nén và index vào AWS Rekognition
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
            <Label htmlFor="image">Ảnh chân dung</Label>
            <Input id="image" name="image" type="file" accept="image/*" required />
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
