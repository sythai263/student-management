import { cn } from "cn";
import type { FieldRowBlock, ReportCardFieldValues } from "@types";

interface FieldRowBlockViewProps {
  block: FieldRowBlock;
  values: ReportCardFieldValues;
}

/** A row of 1-4 cells, each an editable label + the bound field's value. */
export function FieldRowBlockView({ block, values }: FieldRowBlockViewProps) {
  return (
    <div
      className={cn(
        "grid gap-1",
        block.columns === 1 && "grid-cols-1",
        block.columns === 2 && "grid-cols-2",
        block.columns === 3 && "grid-cols-3",
        block.columns === 4 && "grid-cols-4",
      )}
    >
      {block.items.map((item, i) => (
        <div key={i} className="min-w-0 truncate">
          {item.label && <span className="text-black/60">{item.label}: </span>}
          <span className="font-medium">{values[item.field]}</span>
        </div>
      ))}
    </div>
  );
}
