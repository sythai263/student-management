import { commentBulletLines } from "@lib/report-card";
import type { CommentBlock, ReportCardFieldValues } from "@types";

interface CommentBlockViewProps {
  block: CommentBlock;
  values: ReportCardFieldValues;
}

/** Free-text comment ("nhận xét") — each line renders as a round-dot bullet. */
export function CommentBlockView({ block, values }: CommentBlockViewProps) {
  const lines = commentBulletLines(values.comment);

  return (
    <div className="min-h-8 flex-1">
      <span className="font-bold">{block.label}: </span>
      {lines.length <= 1 ? (
        <span>{lines[0] ?? ""}</span>
      ) : (
        <ul className="mt-0.5 list-disc pl-3">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
