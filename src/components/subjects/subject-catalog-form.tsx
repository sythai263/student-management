"use client";

import { useState, useTransition, type FormEventHandler } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSubjectsFromCatalog } from "@lib/actions";
import { useSubjectCatalog, useSubjects } from "@hooks";

export function SubjectCatalogForm() {
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: catalog, isLoading: catalogLoading } = useSubjectCatalog();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const existingNames = new Set(subjects?.map((s) => s.name) ?? []);
  const available = catalog?.filter((c) => !existingNames.has(c.name)) ?? [];

  const isLoading = subjectsLoading || catalogLoading;

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSubjectsFromCatalog(selected);
      if (result.success) {
        setSelected([]);
        setMessage(null);
        await queryClient.invalidateQueries({ queryKey: ["subjects"] });
        setOpen(false);
      } else {
        setMessage(result.error);
      }
    });
  };

  function toggle(name: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, name] : prev.filter((n) => n !== name),
    );
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus /> Thêm môn học
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm môn học từ danh mục THPT</DialogTitle>
            <DialogDescription>
              Chọn các môn cần thêm vào danh sách của bạn.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bạn đã thêm tất cả các môn trong danh mục.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                {available.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(c.name)}
                      onChange={(e) => toggle(c.name, e.target.checked)}
                      className="size-4"
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
              {message && (
                <p className="text-sm text-destructive">{message}</p>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || selected.length === 0}
                >
                  {isPending ? "Đang thêm..." : "Thêm môn đã chọn"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
