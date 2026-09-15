"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveReportCardTemplate } from "@hooks";
import {
  defaultReportCardBlocks,
  REPORT_CARD_FONT_FAMILY,
} from "@lib/report-card";
import { friendlyErrorMessage } from "@lib/utils";
import type { ReportCardBlock, ReportCardTemplateRow } from "@types";
import { BlockInspector } from "./block-inspector";
import { BlockPalette } from "./block-palette";
import { SortableBlockItem } from "./sortable-block-item";

interface TemplateBuilderProps {
  template?: ReportCardTemplateRow;
}

/** Visual, drag-and-drop editor for a report card layout — blocks bind
 * to a fixed field catalogue, no free-form HTML. */
export function TemplateBuilder({ template }: TemplateBuilderProps) {
  const router = useRouter();
  const save = useSaveReportCardTemplate();
  const [name, setName] = useState(template?.name ?? "Mẫu phiếu điểm mới");
  const [blocks, setBlocks] = useState<ReportCardBlock[]>(
    template?.blocks ?? defaultReportCardBlocks(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    blocks[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function onSave() {
    setError(null);
    save.mutate(
      { id: template?.id, name, blocks },
      {
        onSuccess: () => router.push("/report-card-templates"),
        onError: (err) => setError(friendlyErrorMessage(err)),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="templateName">Tên mẫu</Label>
          <Input id="templateName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="button" onClick={onSave} disabled={save.isPending}>
          <Save /> {save.isPending ? "Đang lưu..." : "Lưu mẫu"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
        <BlockPalette
          onAdd={(block) => {
            setBlocks((prev) => [...prev, block]);
            setSelectedId(block.id);
          }}
        />

        <Card>
          <CardContent className="pt-4">
            <div className="mx-auto aspect-[1/1] w-full max-w-sm bg-white p-2 shadow">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    style={{ fontFamily: REPORT_CARD_FONT_FAMILY }}
                    className="flex h-full flex-col gap-1 overflow-y-auto border border-black p-2"
                  >
                    {blocks.map((block) => (
                      <SortableBlockItem
                        key={block.id}
                        block={block}
                        selected={block.id === selectedId}
                        onSelect={() => setSelectedId(block.id)}
                        onDelete={() =>
                          setBlocks((prev) => prev.filter((b) => b.id !== block.id))
                        }
                      />
                    ))}
                    {!blocks.length && (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Thêm khối từ bảng bên trái để bắt đầu thiết kế.
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-4">
            <p className="text-sm font-medium">Tùy chỉnh khối</p>
            {selectedBlock ? (
              <BlockInspector
                block={selectedBlock}
                onChange={(updated) =>
                  setBlocks((prev) =>
                    prev.map((b) => (b.id === updated.id ? updated : b)),
                  )
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Chọn 1 khối trong bản xem trước để chỉnh sửa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
