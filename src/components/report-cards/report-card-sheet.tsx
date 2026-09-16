import { cn } from "cn";
import { buildFieldValues, type ReportCardData } from "@lib/report-card";
import type { ReportCardBlock } from "@types";
import { ReportCardCard } from "./report-card-card";

/** Cards-per-page options and their grid shape on one A4 sheet. */
export const CARDS_PER_PAGE_OPTIONS = [2, 4, 6] as const;
export type CardsPerPage = (typeof CARDS_PER_PAGE_OPTIONS)[number];

const LAYOUT: Record<CardsPerPage, string> = {
  2: "grid-cols-1 grid-rows-2",
  4: "grid-cols-2 grid-rows-2",
  6: "grid-cols-2 grid-rows-3",
};

/** Bigger cards get bigger text. */
const TEXT_SIZE: Record<CardsPerPage, string> = {
  2: "text-sm",
  4: "text-[11px]",
  6: "text-[9px]",
};

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
  teacherName: string;
  schoolName?: string;
  cardsPerPage?: CardsPerPage;
}

/**
 * A4 print layout: N report cards per page, each laid out from the
 * teacher-designed `blocks`. `@page { size: A4 }` lives in globals.css —
 * Tailwind has no utility for page setup — everything else here is plain
 * Tailwind. Cards are meant to be cut out, so only a tiny 3mm safe
 * padding is kept.
 */
export function ReportCardSheet({
  blocks,
  cards,
  signDate,
  signatureImageKey,
  teacherName,
  schoolName,
  cardsPerPage = 6,
}: ReportCardSheetProps) {
  const pages = chunk(cards, cardsPerPage);

  return (
    <div className="space-y-4 print:space-y-0">
      {pages.map((page, pageIndex) => (
        // A4 sheet: fixed 210×297mm; `@page { margin: 0 }` in globals.css
        // leaves the full sheet to us — the 3mm padding is just a safety
        // edge so printers don't clip card borders.
        <div
          key={pageIndex}
          className={cn(
            "mx-auto aspect-[210/297] w-full max-w-[210mm] bg-white p-[3mm] shadow print:aspect-auto print:h-[297mm] print:w-[210mm] print:shadow-none",
            pageIndex < pages.length - 1 && "print:break-after-page",
          )}
        >
          <div
            className={cn("grid h-full w-full gap-3", LAYOUT[cardsPerPage])}
          >
            {page.map((card, cardIndex) => (
              <ReportCardCard
                key={card.studentCode || cardIndex}
                blocks={blocks}
                values={buildFieldValues(card, signDate, teacherName)}
                signatureImageKey={signatureImageKey}
                schoolName={schoolName}
                textSizeClass={TEXT_SIZE[cardsPerPage]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
