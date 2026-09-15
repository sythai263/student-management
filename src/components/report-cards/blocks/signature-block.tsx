import type { ReportCardFieldValues, SignatureBlock } from "@types";

interface SignatureBlockViewProps {
  block: SignatureBlock;
  values: ReportCardFieldValues;
  signatureImageKey: string | null;
}

/** Sign date + teacher signature image, right-aligned. */
export function SignatureBlockView({
  block,
  values,
  signatureImageKey,
}: SignatureBlockViewProps) {
  return (
    <div className="flex items-end justify-end gap-2 border-t border-black/30 pt-1">
      <div className="flex flex-col items-center">
        <span className="text-black/60">
          {block.dateLabel} {values.signDate}
        </span>
        <span className="text-black/60">{block.roleLabel}</span>
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
      </div>
    </div>
  );
}
