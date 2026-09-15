/** Fixed catalogue of fields teachers can bind to a block — no free typing. */
export type ReportCardFieldKey =
  | "subjectName"
  | "studentName"
  | "studentCode"
  | "classCode"
  | "className"
  | "semesterLabel"
  | "tx1"
  | "tx2"
  | "tx3"
  | "tx4"
  | "gk"
  | "ck"
  | "average"
  | "comment"
  | "signDate";

export type ReportCardFieldValues = Record<ReportCardFieldKey, string>;

/** A row of 1-4 cells, each showing an editable label + a bound field's value. */
export interface FieldRowBlock {
  id: string;
  type: "fieldRow";
  columns: 1 | 2 | 3 | 4;
  items: { field: ReportCardFieldKey; label: string }[];
}

/** Emphasized average score box. */
export interface AverageBlock {
  id: string;
  type: "average";
  label: string;
}

/** Free-text comment ("nhận xét") bound to the grade's comment field. */
export interface CommentBlock {
  id: string;
  type: "comment";
  label: string;
}

/** Sign date + teacher signature image. */
export interface SignatureBlock {
  id: string;
  type: "signature";
  dateLabel: string;
  roleLabel: string;
}

/** Thin visual separator line. */
export interface DividerBlock {
  id: string;
  type: "divider";
}

export type ReportCardBlock =
  | FieldRowBlock
  | AverageBlock
  | CommentBlock
  | SignatureBlock
  | DividerBlock;

export interface ReportCardTemplateRow {
  id: string;
  teacherId: string;
  name: string;
  blocks: ReportCardBlock[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
