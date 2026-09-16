"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteReportCardTemplate,
  useReportCardTemplates,
  useSetDefaultReportCardTemplate,
} from "@hooks";
import type { ReportCardTemplateRow } from "@types";

/** List of the teacher's saved report card templates — create, edit, set default, delete. */
export function ReportCardTemplateList() {
  const { data: templates, isLoading, error } = useReportCardTemplates();
  const deleteTemplate = useDeleteReportCardTemplate();
  const setDefault = useSetDefaultReportCardTemplate();
  const [toDelete, setToDelete] = useState<ReportCardTemplateRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mẫu được chọn &quot;mặc định&quot; sẽ tự động dùng khi vào trang phiếu
          điểm.
        </p>
        <Link
          href="/report-card-templates/new"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus /> Tạo mẫu mới
        </Link>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : !templates?.length ? (
        <p className="text-sm text-muted-foreground">
          Chưa có mẫu nào — trang phiếu điểm sẽ dùng mẫu mặc định có sẵn của hệ thống.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5">
                    {t.name}
                    {t.isDefault && (
                      <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link
                  href={`/report-card-templates/${t.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Pencil /> Sửa
                </Link>
                {!t.isDefault && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={setDefault.isPending}
                    onClick={() => setDefault.mutate(t.id)}
                  >
                    <Star /> Đặt làm mặc định
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setToDelete(t)}
                >
                  <Trash2 className="text-destructive" /> Xóa
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa mẫu phiếu điểm</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa mẫu <strong>{toDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteTemplate.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toDelete) {
                  deleteTemplate.mutate(toDelete.id, {
                    onSuccess: () => setToDelete(null),
                  });
                }
              }}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
