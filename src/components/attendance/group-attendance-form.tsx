"use client";

import { useState, useTransition } from "react";
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
import { groupAttendance } from "@lib/actions";
import { compressImage } from "@lib/image";

interface GroupAttendanceFormProps {
  classId: string;
}

export function GroupAttendanceForm({ classId }: GroupAttendanceFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("photos") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) {
      setIsError(true);
      setMessage("Chọn ít nhất 1 ảnh nhóm");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("classId", classId);
      const dateValue = (
        form.elements.namedItem("sessionDate") as HTMLInputElement
      ).value;
      if (dateValue) fd.set("sessionDate", dateValue);
      for (const file of files) {
        fd.append("photos", await compressImage(file, 1920, 0.85));
      }

      const result = await groupAttendance(fd);
      setIsError(!result.success);
      setMessage(
        result.success
          ? `Điểm danh xong: ${result.data.presentCount}/${result.data.totalCount} có mặt`
          : result.error,
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh nhóm</CardTitle>
        <CardDescription>
          Upload nhiều ảnh nhóm — hệ thống tự nhận diện và ghi CO_MAT/VANG
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionDate">Ngày điểm danh</Label>
            <Input id="sessionDate" name="sessionDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photos">Ảnh nhóm (nhiều ảnh)</Label>
            <Input
              id="photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              required
            />
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
            {isPending ? "Đang nhận diện..." : "Điểm danh"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
