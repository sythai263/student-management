"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { REPORT_CARD_SAMPLE_VALUES } from "@lib/report-card";
import type { ReportCardBlock } from "@types";
import { BlockRenderer } from "../blocks";

interface SortableBlockItemProps {
  block: ReportCardBlock;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/** One block row in the canvas — draggable to reorder, click to edit, live-previewed with sample data. */
export function SortableBlockItem({
  block,
  selected,
  onSelect,
  onDelete,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-start gap-1 rounded border bg-white p-1",
        selected ? "border-primary ring-1 ring-primary" : "border-transparent",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label="Kéo để sắp xếp"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        className="min-w-0 flex-1 text-left text-[9px] leading-tight text-black"
        onClick={onSelect}
      >
        <BlockRenderer
          block={block}
          values={REPORT_CARD_SAMPLE_VALUES}
          signatureImageKey={null}
        />
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Xóa khối"
        onClick={onDelete}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
