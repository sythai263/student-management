"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubjects, useDeleteSubject } from "@hooks";
import type { Subject } from "@types";

export function SubjectList() {
  const { data: subjects, isLoading, error } = useSubjects();
  const deleteSubjectMutation = useDeleteSubject();
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!subjects?.length) {
    return <p className="text-muted-foreground">Chưa có môn học nào.</p>;
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        {subjects.map((s) => (
          <Card key={s.id} className="relative group">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>{s.code ?? "—"}</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Xóa môn ${s.name}`}
                  onClick={() => setSubjectToDelete(s)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Dialog
        open={subjectToDelete !== null}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa môn học</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa môn <strong>{subjectToDelete?.name}</strong>?
              Các đợt kiểm tra và điểm số liên quan sẽ bị xóa theo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubjectToDelete(null)}
              disabled={deleteSubjectMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (subjectToDelete) {
                  deleteSubjectMutation.mutate(subjectToDelete.id, {
                    onSuccess: () => setSubjectToDelete(null),
                  });
                }
              }}
              disabled={deleteSubjectMutation.isPending}
            >
              {deleteSubjectMutation.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
