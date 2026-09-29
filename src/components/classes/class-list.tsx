"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownAZ, ArrowDownZA, School, Trash2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { CardGridSkeleton } from "../ui/card-grid-skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "../ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import { useClasses, useDeleteClass } from "@hooks";
import type { Class } from "@types";

export function ClassList() {
  const { data: classes, isLoading, error } = useClasses();
  const deleteClassMutation = useDeleteClass();
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (isLoading) {
    return <CardGridSkeleton />;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!classes?.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <School />
          </EmptyMedia>
          <EmptyTitle>Chưa có lớp nào.</EmptyTitle>
          <EmptyDescription>
            Tạo lớp đầu tiên để bắt đầu quản lý học sinh.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const sortedClasses = [...classes].sort((a, b) => {
    const cmp = a.classCode.localeCompare(b.classCode, "vi", {
      numeric: true,
    });
    return sortAsc ? cmp : -cmp;
  });

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={sortAsc ? "Sắp xếp mã lớp Z-A" : "Sắp xếp mã lớp A-Z"}
          onClick={() => setSortAsc((v) => !v)}
        >
          {sortAsc ? (
            <ArrowDownAZ className="size-4" />
          ) : (
            <ArrowDownZA className="size-4" />
          )}
          Mã lớp
        </Button>
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        {sortedClasses.map((c) => (
          <Link key={c.id} href={`/classes/${c.id}`} className="relative group">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{c.classCode}</CardTitle>
                    <CardDescription>
                      {c.name} · Năm học {c.schoolYear}
                      {c.school?.name ? ` · ${c.school.name}` : ""}
                    </CardDescription>
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
                    onSuccess: () => {
                      toast.success("Đã xóa lớp");
                      setClassToDelete(null);
                    },
                    onError: (err) => toast.error(err.message),
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
