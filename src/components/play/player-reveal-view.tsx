import type { LeaderboardEntry, PublicQuestion, RevealPayload } from "@types";

interface PlayerRevealViewProps {
  question: PublicQuestion;
  reveal: RevealPayload;
  picked: number | null;
  myEntry: LeaderboardEntry | undefined;
}

/** Reveal phase: whether the pick was right + running score. */
export function PlayerRevealView({
  question,
  reveal,
  picked,
  myEntry,
}: PlayerRevealViewProps) {
  const headline =
    picked === null
      ? "Hết giờ!"
      : picked === reveal.correctIndex
        ? "Chính xác!"
        : "Chưa đúng!";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-semibold">{headline}</h2>
      <p className="text-muted-foreground">
        Đáp án đúng: {question.options[reveal.correctIndex]}
      </p>
      {myEntry && (
        <p className="text-lg">
          Điểm của bạn: <span className="font-mono">{myEntry.score}</span>
        </p>
      )}
    </div>
  );
}
