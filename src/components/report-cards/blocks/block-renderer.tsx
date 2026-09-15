import type { ReportCardBlock, ReportCardFieldValues } from "@types";
import { AverageBlockView } from "./average-block";
import { CommentBlockView } from "./comment-block";
import { DividerBlockView } from "./divider-block";
import { FieldRowBlockView } from "./field-row-block";
import { SignatureBlockView } from "./signature-block";

interface BlockRendererProps {
  block: ReportCardBlock;
  values: ReportCardFieldValues;
  signatureImageKey: string | null;
}

/** Renders a single block by type — shared by the template builder's
 * live preview and the final report card sheet. */
export function BlockRenderer({
  block,
  values,
  signatureImageKey,
}: BlockRendererProps) {
  switch (block.type) {
    case "fieldRow":
      return <FieldRowBlockView block={block} values={values} />;
    case "average":
      return <AverageBlockView block={block} values={values} />;
    case "comment":
      return <CommentBlockView block={block} values={values} />;
    case "signature":
      return (
        <SignatureBlockView
          block={block}
          values={values}
          signatureImageKey={signatureImageKey}
        />
      );
    case "divider":
      return <DividerBlockView />;
  }
}
