import type { CommentBlock, ReportCardFieldValues } from "@types";

interface CommentBlockViewProps {
  block: CommentBlock;
  values: ReportCardFieldValues;
}

/** Free-text comment ("nhận xét"). */
export function CommentBlockView({ block, values }: CommentBlockViewProps) {
  return (
    <div className="min-h-8 flex-1">
      <span className="font-medium">{block.label}: </span>
      <span>{values.comment}</span>
    </div>
  );
}
