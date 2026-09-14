"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type SubmitEventHandler,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStudent } from "@lib/actions";
import { compressImage } from "@lib/image";
import type { Student } from "@types";

interface StudentEditDialogProps {
  student: Student | null;
  onClose: () => void;
}

/** Per-student edit dialog — update info and re-index the face with a new photo. */
export function StudentEditDialog({ student, onClose }: StudentEditDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset per-student state each time a different student is opened.
  useEffect(() => {
    setPreview(null);
    setMessage(null);
  }, [student]);

  // Release object URLs created for the picked-file preview.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!student) return null;

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0];

    startTransition(async () => {
      // Client compresses the image before calling the Server Action.
      if (file) fd.set("image", await compressImage(file));
      fd.set("studentId", student.id);

      const result = await updateStudent(fd);
      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: ["students", student.classId],
        });
        onClose();
      } else {
        setMessage(result.error);
      }
    });
  };

  const avatarSrc = preview ?? student.avatarUrl;

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa học sinh</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{student.studentCode}</span>
            {student.awsFaceId ? (
              <Badge>Đã index</Badge>
            ) : (
              <Badge variant="secondary">Chưa có</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* key remounts the form per student so defaultValue stays in sync */}
        <form key={student.id} onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={`${student.lastName} ${student.firstName}`}
                className="size-24 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-md bg-muted">
                <UserRound className="size-10 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-image">
                {preview ? "Ảnh mới đã chọn" : "Ảnh chân dung mới"}
              </Label>
              <Input
                id="edit-image"
                name="image"
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Họ & tên đệm</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                required
                defaultValue={student.lastName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Tên</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                required
                defaultValue={student.firstName}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-dateOfBirth">Ngày sinh</Label>
              <Input
                id="edit-dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={student.dateOfBirth ?? ""}
              />
            </div>
          </div>

          {message && <p className="text-sm text-destructive">{message}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
