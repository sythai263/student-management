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
import { PageHeader } from "../layout";
import { CreateClassForm } from "./create-class-form";
import { useClasses, useDeleteClass } from "@hooks";
import type { Class } from "@types";

export function ClassList() {
  const { data: classes, isLoading, error } = useClasses();
  const deleteClassMutation = useDeleteClass();
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedClasses = [...(classes ?? [])].sort((a, b) => {
    const cmp = a.classCode.localeCompare(b.classCode, "vi", {
      numeric: true,
    });
    return sortAsc ? cmp : -cmp;
  });

  // Group classes by subject — a class assigned to many subjects appears
  // in each group, and its link carries that subject's context.
  const subjectGroups = new Map<
    string,
    { id: string; name: string; classes: Class[] }
  >();
  const unassigned: Class[] = [];
  for (const c of sortedClasses) {
    const subs = (c.classSubjects ?? []).filter((cs) => cs.subjects?.name);
    if (subs.length === 0) {
      unassigned.push(c);
      continue;
    }
    for (const cs of subs) {
      const group = subjectGroups.get(cs.subjectId) ?? {
        id: cs.subjectId,
        name: cs.subjects?.name ?? "",
        classes: [],
      };
      group.classes.push(c);
      subjectGroups.set(cs.subjectId, group);
    }
  }
  const groups = [...subjectGroups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "vi"),
  );
  if (unassigned.length > 0) {
    groups.push({ id: "", name: "Chưa gán môn", classes: unassigned });
  }

  const renderCard = (c: Class, subjectId?: string) => (
    <Link
      key={subjectId ? `${subjectId}-${c.id}` : c.id}
      href={
        subjectId
          ? `/classes/${c.id}?subjectId=${subjectId}`
          : `/classes/${c.id}`
      }
      className="relative group"
    >
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
  );

  return (
    <>
      <PageHeader
        title="Lớp học của tôi"
        actions={
          <>
            {sortedClasses.length > 0 && (
              <Button
                type="button"
                variant="outline"
                aria-label={
                  sortAsc ? "Sắp xếp mã lớp Z-A" : "Sắp xếp mã lớp A-Z"
                }
                title={sortAsc ? "Sắp xếp mã lớp Z-A" : "Sắp xếp mã lớp A-Z"}
                onClick={() => setSortAsc((v) => !v)}
              >
                {sortAsc ? (
                  <ArrowDownAZ className="size-4" />
                ) : (
                  <ArrowDownZA className="size-4" />
                )}
                <span className="hidden sm:inline">Mã lớp</span>
              </Button>
            )}
            <CreateClassForm />
          </>
        }
      />

      {isLoading ? (
        <CardGridSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : sortedClasses.length === 0 ? (
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
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.id || "unassigned"} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {g.id ? `Môn ${g.name}` : g.name} ({g.classes.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {g.classes.map((c) => renderCard(c, g.id || undefined))}
              </div>
            </section>
          ))}
        </div>
      )}

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
