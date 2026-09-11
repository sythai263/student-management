"use client";

import { useState, useTransition, type FormEventHandler } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSubjectsFromCatalog } from "@lib/actions";
import { SUBJECT_CATALOG } from "@constants";
import { useSubjects } from "@hooks";

export function SubjectCatalogForm() {
  const { data: subjects, isLoading } = useSubjects();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const existingNames = new Set(subjects?.map((s) => s.name) ?? []);
  const available = SUBJECT_CATALOG.filter((c) => !existingNames.has(c.name));

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSubjectsFromCatalog(selected);
      if (result.success) {
        setSelected([]);
        setMessage(
          `Đã thêm ${result.data.length} môn vào danh sách của bạn.`,
        );
        await queryClient.invalidateQueries({ queryKey: ["subjects"] });
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
    <Card>
      <CardHeader>
        <CardTitle>Thêm từ danh mục THPT</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Bạn đã thêm tất cả các môn trong danh mục.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {available.map((c) => (
                <label
                  key={c.code}
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
              <p
                className={
                  message.startsWith("Đã thêm")
                    ? "text-sm text-green-600"
                    : "text-sm text-destructive"
                }
              >
                {message}
              </p>
            )}
            <Button
              type="submit"
              disabled={isPending || selected.length === 0}
            >
              <Plus /> Thêm môn đã chọn
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
