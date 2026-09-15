"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateSchool,
  useDeleteSchool,
  useRenameSchool,
  useSchools,
} from "@hooks";
import { friendlyErrorMessage } from "@lib/utils";

interface SchoolsManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Manage the list of schools the teacher teaches at. Classes map to a
 * school so report cards can fill the school name automatically.
 * Deleting a school unmaps it from classes (classes are kept).
 */
export function SchoolsManageDialog({
  open,
  onOpenChange,
}: SchoolsManageDialogProps) {
  const { data: schools, isLoading } = useSchools();
  const createSchool = useCreateSchool();
  const renameSchool = useRenameSchool();
  const deleteSchool = useDeleteSchool();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onAdd() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createSchool.mutateAsync(name.trim());
        setName("");
      } catch (err) {
        setError(friendlyErrorMessage(err));
      }
    });
  }

  function onSaveRename(id: string) {
    if (!editingName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await renameSchool.mutateAsync({ id, name: editingName.trim() });
        setEditingId(null);
      } catch (err) {
        setError(friendlyErrorMessage(err));
      }
    });
  }

  function onDelete(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteSchool.mutateAsync(id);
      } catch (err) {
        setError(friendlyErrorMessage(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trường giảng dạy</DialogTitle>
          <DialogDescription>
            Danh sách trường bạn đang dạy. Lớp học gắn vào trường để phiếu
            điểm tự điền tên trường.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-school">Thêm trường</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="new-school"
                placeholder={"VD: Trường THPT\nNguyễn Du"}
                value={name}
                disabled={isPending}
                rows={2}
                className="min-h-0"
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                type="button"
                disabled={isPending || !name.trim()}
                onClick={onAdd}
              >
                <Plus /> Thêm
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter để xuống dòng — tên trường sẽ ngắt dòng đúng chỗ đó trên
              phiếu điểm.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : !schools?.length ? (
            <p className="text-sm text-muted-foreground">
              Chưa có trường nào.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {schools.map((s) => (
                <li key={s.id} className="flex items-center gap-2 p-2">
                  {editingId === s.id ? (
                    <>
                      <Textarea
                        value={editingName}
                        disabled={isPending}
                        rows={2}
                        className="min-h-0"
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Lưu tên trường"
                        disabled={isPending || !editingName.trim()}
                        onClick={() => onSaveRename(s.id)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Hủy đổi tên"
                        disabled={isPending}
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate px-1 text-sm">
                        {s.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Đổi tên trường ${s.name}`}
                        disabled={isPending}
                        onClick={() => {
                          setEditingId(s.id);
                          setEditingName(s.name);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xóa trường ${s.name}`}
                        disabled={isPending}
                        onClick={() => onDelete(s.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">
            Xóa trường sẽ tự gỡ trường khỏi các lớp đang gắn (lớp không bị
            xóa).
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
