"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteSignature,
  useSaveSignature,
  useTeacherSignature,
} from "@hooks";
import { toast } from "sonner";
import { uploadSignatureDirect } from "@lib/image";
import { friendlyErrorMessage } from "@lib/utils";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

interface SignatureManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Manage the teacher's signature image (PNG, transparent background),
 * used when printing report cards. Only one signature is kept on file;
 * uploading a new one replaces the previous.
 */
export function SignatureManageDialog({
  open,
  onOpenChange,
}: SignatureManageDialogProps) {
  const { data: signature, isLoading } = useTeacherSignature();
  const saveSignature = useSaveSignature();
  const deleteSignature = useDeleteSignature();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    startTransition(async () => {
      try {
        const imageKey = await uploadSignatureDirect(file);
        await saveSignature.mutateAsync(imageKey);
        toast.success("Đã lưu chữ ký");
      } catch (err) {
        toast.error(friendlyErrorMessage(err));
      }
    });
  }

  function onPadSave(file: File) {
    startTransition(async () => {
      try {
        const imageKey = await uploadSignatureDirect(file);
        await saveSignature.mutateAsync(imageKey);
        toast.success("Đã lưu chữ ký");
        padRef.current?.clear();
      } catch (err) {
        toast.error(friendlyErrorMessage(err));
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteSignature.mutateAsync();
        toast.success("Đã xóa chữ ký");
      } catch (err) {
        toast.error(friendlyErrorMessage(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chữ ký giáo viên</DialogTitle>
          <DialogDescription>
            Ký trực tiếp hoặc tải ảnh PNG nền trong suốt, dùng để in vào
            phiếu điểm học sinh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : signature ? (
            <div className="flex items-center gap-4 rounded-md border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/image?key=${encodeURIComponent(signature.imageKey)}`}
                alt="Chữ ký hiện tại"
                className="h-16 w-32 object-contain"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onDelete}
              >
                <Trash2 /> Xóa chữ ký
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có chữ ký nào được lưu.
            </p>
          )}

          <div className="space-y-2">
            <Label>Ký trực tiếp</Label>
            <SignaturePad
              ref={padRef}
              disabled={isPending}
              onSave={onPadSave}
              onError={toast.error}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature-file">
              {signature ? "Hoặc thay bằng ảnh PNG" : "Hoặc tải ảnh PNG"}
            </Label>
            <Input
              ref={inputRef}
              id="signature-file"
              type="file"
              accept="image/png"
              disabled={isPending}
              onChange={onFileChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
