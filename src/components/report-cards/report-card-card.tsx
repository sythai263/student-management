import type { ReportCardBlock, ReportCardFieldValues } from "@types";
import { BlockRenderer } from "./blocks";

interface ReportCardCardProps {
  blocks: ReportCardBlock[];
  values: ReportCardFieldValues;
  signatureImageKey: string | null;
}

/** Fixed card frame (border/padding/text size) around a teacher-designed
 * block layout — one of six laid out per A4 sheet. */
export function ReportCardCard({
  blocks,
  values,
  signatureImageKey,
}: ReportCardCardProps) {
  return (
    <div className="flex h-full w-full flex-col gap-1.5 overflow-hidden border border-black p-2.5 text-[9px] leading-tight text-black">
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          values={values}
          signatureImageKey={signatureImageKey}
        />
      ))}
    </div>
  );
}
