import { cn } from "cn";
import { buildFieldValues, type ReportCardData } from "@lib/report-card";
import type { ReportCardBlock } from "@types";
import { ReportCardCard } from "./report-card-card";

const CARDS_PER_PAGE = 6;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

interface ReportCardSheetProps {
  blocks: ReportCardBlock[];
  cards: ReportCardData[];
  signDate: string;
  signatureImageKey: string | null;
}

/**
 * A4 print layout: 6 report cards per page (2 columns × 3 rows), each
 * laid out from the teacher-designed `blocks`.
 * `@page { size: A4 }` lives in globals.css — Tailwind has no utility
 * for page setup — everything else here is plain Tailwind.
 */
export function ReportCardSheet({
  blocks,
  cards,
  signDate,
  signatureImageKey,
}: ReportCardSheetProps) {
  const pages = chunk(cards, CARDS_PER_PAGE);

  return (
    <div className="space-y-4 print:space-y-0">
      {pages.map((page, pageIndex) => (
        // A4 sheet: fixed 210×297mm with a 10mm margin baked into the
        // padding (the `@page { margin: 0 }` in globals.css leaves the
        // full sheet to us, so the "margin" here is just our padding).
        <div
          key={pageIndex}
          className={cn(
            "mx-auto aspect-[210/297] w-full max-w-[210mm] bg-white p-[10mm] shadow print:aspect-auto print:h-[297mm] print:w-[210mm] print:shadow-none",
            pageIndex < pages.length - 1 && "print:break-after-page",
          )}
        >
          <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-3">
            {page.map((card) => (
              <ReportCardCard
                key={card.studentCode}
                blocks={blocks}
                values={buildFieldValues(card, signDate)}
                signatureImageKey={signatureImageKey}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
