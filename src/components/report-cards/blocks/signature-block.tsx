import { commentBulletLines } from "@lib/report-card";
import type {
  LetterheadRatio,
  ReportCardFieldValues,
  SignatureBlock,
} from "@types";

interface SignatureBlockViewProps {
  block: SignatureBlock;
  values: ReportCardFieldValues;
  signatureImageKey: string | null;
}

/** Fixed class map — same scale as the letterhead ratio, never free-form. */
const RATIO_CLASSES: Record<LetterheadRatio, { left: string; right: string }> = {
  "1-3": { left: "w-1/4", right: "w-3/4" },
  "1-2": { left: "w-1/3", right: "w-2/3" },
  "1-1": { left: "w-1/2", right: "w-1/2" },
  "2-1": { left: "w-2/3", right: "w-1/3" },
  "3-1": { left: "w-3/4", right: "w-1/4" },
};

/** Sign date + teacher signature image + teacher name, right-aligned —
 * optionally with the comment on the same row, to the left. */
export function SignatureBlockView({
  block,
  values,
  signatureImageKey,
}: SignatureBlockViewProps) {
  const widths = RATIO_CLASSES[block.ratio ?? "2-1"];

  const signature = (
    <div className="flex flex-col items-center">
      <span className="font-bold italic">
        {block.dateLabel} {values.signDate}
      </span>
      <span className="font-bold">{block.roleLabel}</span>
      {signatureImageKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/image?key=${encodeURIComponent(signatureImageKey)}`}
          alt="Chữ ký giáo viên"
          className="h-10 w-20 object-contain"
        />
      ) : (
        <div className="h-10 w-20" />
      )}
      <span className="font-bold">{values.teacherName}</span>
    </div>
  );

  if (!block.showComment) {
    return (
      <div className="flex min-h-16 flex-1 items-end justify-end p-1">
        {signature}
      </div>
    );
  }

  const commentLines = commentBulletLines(values.comment);

  return (
    <div className="flex min-h-16 flex-1 items-end justify-between gap-2 p-1">
      <div className={`${widths.left} self-start`}>
        <span className="font-bold">{block.commentLabel ?? "Nhận xét"}: </span>
        {commentLines.length <= 1 ? (
          <span>{commentLines[0] ?? ""}</span>
        ) : (
          <ul className="mt-0.5 list-disc pl-3">
            {commentLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      <div className={`${widths.right} flex justify-end`}>{signature}</div>
    </div>
  );
}
