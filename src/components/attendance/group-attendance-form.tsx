"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { groupAttendance } from "@lib/actions";
import { compressImage } from "@lib/image";

interface GroupAttendanceFormProps {
  classId: string;
}

export function GroupAttendanceForm({ classId }: GroupAttendanceFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileCount, setFileCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const files = Array.from(fileRef.current?.files ?? []);
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
      if (result.success) {
        setMessage(
          `Điểm danh xong: ${result.data.presentCount}/${result.data.totalCount} có mặt`,
        );
        await queryClient.invalidateQueries({ queryKey: ["sessions", classId] });
        router.push(`/classes/${classId}/attendance/${result.data.sessionId}`);
      } else {
        setMessage(result.error);
      }
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
          {/* Mobile-first: big touch target opens camera/gallery directly */}
          <div className="space-y-2">
            <Label htmlFor="photos">Ảnh nhóm</Label>
            <Input
              id="photos"
              name="photos"
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              required
              className="hidden"
              onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/40 p-6 text-center transition-colors active:border-primary active:bg-accent"
            >
              <span className="text-base font-medium">
                {fileCount > 0 ? `Đã chọn ${fileCount} ảnh` : "Chụp / chọn ảnh"}
              </span>
              <span className="text-xs text-muted-foreground">
                Chạm để mở camera hoặc thư viện ảnh
              </span>
            </button>
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
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "Đang nhận diện..." : "Điểm danh"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
