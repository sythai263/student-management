import type { AverageBlock, ReportCardFieldValues } from "@types";

interface AverageBlockViewProps {
  block: AverageBlock;
  values: ReportCardFieldValues;
}

/** Emphasized average score box. */
export function AverageBlockView({ block, values }: AverageBlockViewProps) {
  return (
    <div className="flex items-center justify-center gap-2 rounded border border-black/50 bg-black/5 py-1">
      <span className="font-medium">{block.label}:</span>
      <span className="text-lg font-bold">{values.average}</span>
    </div>
  );
}
