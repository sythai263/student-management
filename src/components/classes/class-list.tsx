"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClasses, useDeleteClass } from "@hooks";
import type { Class } from "@types";

export function ClassList() {
  const { data: classes, isLoading, error } = useClasses();
  const deleteClassMutation = useDeleteClass();
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!classes?.length) {
    return <p className="text-muted-foreground">Chưa có lớp nào.</p>;
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        {classes.map((c) => (
          <Link key={c.id} href={`/classes/${c.id}`} className="relative group">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{c.name}</CardTitle>
                    <CardDescription>Năm học {c.schoolYear}</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Xóa lớp ${c.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setClassToDelete(c);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <Dialog
        open={classToDelete !== null}
        onOpenChange={(open) => !open && setClassToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa lớp</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa lớp <strong>{classToDelete?.name}</strong>?
              Toàn bộ học sinh, buổi điểm danh, điểm số và dữ liệu liên quan sẽ
              bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClassToDelete(null)}
              disabled={deleteClassMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (classToDelete) {
                  deleteClassMutation.mutate(classToDelete.id, {
                    onSuccess: () => setClassToDelete(null),
                  });
                }
              }}
              disabled={deleteClassMutation.isPending}
            >
              {deleteClassMutation.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
