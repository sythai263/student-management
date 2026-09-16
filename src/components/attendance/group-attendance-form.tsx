"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { groupAttendance } from "@lib/actions";
import { compressImage, uploadDirect } from "@lib/image";

interface GroupAttendanceFormProps {
  classId: string;
  sessionDate: string;
  onSuccess?: (sessionId: string) => void;
}

export function GroupAttendanceForm({
  classId,
  sessionDate,
  onSuccess,
}: GroupAttendanceFormProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileCount, setFileCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) {
      toast.error("Chọn ít nhất 1 ảnh nhóm");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("classId", classId);
      fd.set("sessionDate", sessionDate);
      fd.set("clientHour", String(new Date().getHours()));
      // Original + compressed copies are uploaded directly to storage
      // from the browser — a Server Action body must stay well under
      // Vercel's 4.5MB request limit.
      await Promise.all(
        files.map(async (file, i) => {
          const label = `${sessionDate}-${i}`;
          const [photoKey, displayKey] = await Promise.all([
            uploadDirect("attendance-original", classId, label, file),
            uploadDirect(
              "attendance-display",
              classId,
              label,
              await compressImage(file, 1920, 0.85),
            ),
          ]);
          fd.append("photoKeys", photoKey);
          fd.append("photoDisplayKeys", displayKey);
        }),
      );

      const result = await groupAttendance(fd);
      if (result.success) {
        toast.success(
          `Điểm danh xong: ${result.data.presentCount}/${result.data.totalCount} có mặt`,
        );
        await queryClient.invalidateQueries({ queryKey: ["sessions", classId] });
        onSuccess?.(result.data.sessionId);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Đang nhận diện..." : "Bắt đầu điểm danh"}
      </Button>
    </form>
  );
}
