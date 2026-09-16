"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, PenLine } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createManualSession } from "@lib/actions";
import { localToday } from "@lib/attendance-session";
import { FEATURE_FLAGS } from "@constants";
import { GroupAttendanceForm } from "./group-attendance-form";

interface AttendanceActionsProps {
  classId: string;
}

export function AttendanceActions({ classId }: AttendanceActionsProps) {
  const router = useRouter();
  const [date, setDate] = useState(localToday);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleManual() {
    startTransition(async () => {
      const result = await createManualSession(
        classId,
        date,
        new Date().getHours(),
      );
      if (result.success) {
        router.push(`/classes/${classId}/attendance/${result.data.sessionId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh</CardTitle>
        <CardDescription>Chọn ngày và hình thức điểm danh</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="session-date">Ngày điểm danh</Label>
          <Input
            id="session-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={handleManual}
            disabled={isPending}
            className="flex-1"
          >
            <PenLine />
            {isPending ? "Đang tạo..." : "Điểm danh thủ công"}
          </Button>
          {FEATURE_FLAGS.PHOTO_ATTENDANCE && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(true)}
              className="flex-1"
            >
              <Camera />
              Điểm danh bằng ảnh
            </Button>
          )}
        </div>
      </CardContent>

      {FEATURE_FLAGS.PHOTO_ATTENDANCE && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Điểm danh bằng ảnh</DialogTitle>
              <DialogDescription>
                Tải ảnh nhóm lên để hệ thống tự nhận diện học sinh có mặt.
              </DialogDescription>
            </DialogHeader>
            <GroupAttendanceForm
              classId={classId}
              sessionDate={date}
              onSuccess={(sessionId) => {
                setDialogOpen(false);
                router.push(`/classes/${classId}/attendance/${sessionId}`);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
