import type { ReportCardBlock, ReportCardFieldValues } from "@types";
import { REPORT_CARD_FONT_FAMILY } from "@lib/report-card";
import { BlockRenderer } from "./blocks";

interface ReportCardCardProps {
  blocks: ReportCardBlock[];
  values: ReportCardFieldValues;
  signatureImageKey: string | null;
  schoolName?: string;
  /** Tailwind text-size class — scales with how many cards share a page. */
  textSizeClass?: string;
}

/** Fixed card frame (border/padding/text size) around a teacher-designed
 * block layout — one of N laid out per A4 sheet. */
export function ReportCardCard({
  blocks,
  values,
  signatureImageKey,
  schoolName,
  textSizeClass = "text-[9px]",
}: ReportCardCardProps) {
  return (
    <div
      style={{ fontFamily: REPORT_CARD_FONT_FAMILY }}
      className={`flex h-full w-full flex-col gap-1.5 overflow-hidden border border-black p-3.5 leading-tight text-black ${textSizeClass}`}
    >
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          values={values}
          signatureImageKey={signatureImageKey}
          schoolName={schoolName}
        />
      ))}
    </div>
  );
}
