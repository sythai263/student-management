import type { LetterheadBlock, LetterheadRatio } from "@types";

interface LetterheadBlockViewProps {
  block: LetterheadBlock;
  /** Overrides `block.schoolName` — the school name input on the report card page. */
  schoolName?: string;
}

/** Fixed class map — ratios stay inside this whitelist, never free-form. */
const RATIO_CLASSES: Record<LetterheadRatio, { left: string; right: string }> = {
  "1-3": { left: "w-1/4", right: "w-3/4" },
  "1-2": { left: "w-1/3", right: "w-2/3" },
  "2-3": { left: "w-2/5", right: "w-3/5" },
  "1-1": { left: "w-1/2", right: "w-1/2" },
  "2-1": { left: "w-2/3", right: "w-1/3" },
  "3-1": { left: "w-3/4", right: "w-1/4" },
};

const DEFAULT_RATIO: LetterheadRatio = "1-2";

/**
 * School name (left) + Vietnamese national heading ("quốc hiệu tiêu
 * ngữ", right) followed by a centered title. Font is applied by the
 * surrounding report card — Times New Roman for the whole template.
 */
export function LetterheadBlockView({
  block,
  schoolName,
}: LetterheadBlockViewProps) {
  const widths = RATIO_CLASSES[block.ratio ?? DEFAULT_RATIO];
  const school = schoolName?.trim() || block.schoolName;

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className={`${widths.left} text-center font-bold uppercase`}>
          {school}
        </div>
        <div className={`${widths.right} text-center`}>
          <p className="font-bold uppercase">
            Cộng hòa xã hội chủ nghĩa Việt Nam
          </p>
          <p className="inline-block border-b border-black">
            Độc lập - Tự do - Hạnh phúc
          </p>
        </div>
      </div>
      <p className="text-center text-sm font-bold uppercase">{block.title}</p>
    </div>
  );
}
