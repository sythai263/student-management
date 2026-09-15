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
  | "signDate"
  | "teacherName";

export type ReportCardFieldValues = Record<ReportCardFieldKey, string>;

/** A row of 1-4 cells, each showing an editable label + a bound field's value. */
export interface FieldRowBlock {
  id: string;
  type: "fieldRow";
  columns: 1 | 2 | 3 | 4;
  items: { field: ReportCardFieldKey; label: string }[];
  /** Text alignment — optional, saved templates default to left. */
  align?: "left" | "center";
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

/**
 * Sign date + teacher signature image + teacher name. Optionally shows
 * the comment on the same row, to the left — `ratio` is the width split
 * comment/signature, same scale as the letterhead ratio. Optional fields
 * stay undefined in templates saved before they existed.
 */
export interface SignatureBlock {
  id: string;
  type: "signature";
  dateLabel: string;
  roleLabel: string;
  showComment?: boolean;
  commentLabel?: string;
  ratio?: LetterheadRatio;
}

/** Thin visual separator line. */
export interface DividerBlock {
  id: string;
  type: "divider";
}

/**
 * Score grid: 3 rows × 6 columns — header labels (TX1-4, GK, CK),
 * the student's scores, and the coefficient row (1,1,1,1,2,3).
 * No config: labels/weights come straight from the grade constants.
 */
export interface ScoreTableBlock {
  id: string;
  type: "scoreTable";
}

/** Width split between the school name (left) and the national heading (right). */
export type LetterheadRatio = "1-3" | "1-2" | "1-1" | "2-1" | "3-1";

/**
 * Header row: school name (left) + the Vietnamese national heading —
 * "quốc hiệu tiêu ngữ" (right), followed by a centered title. School
 * name and title are fixed text (same for every student), not bound
 * to per-student data. `ratio` is optional because templates saved
 * before it existed simply fall back to the default split.
 */
export interface LetterheadBlock {
  id: string;
  type: "letterhead";
  schoolName: string;
  title: string;
  ratio?: LetterheadRatio;
}

/** Standalone national heading ("quốc hiệu tiêu ngữ"), centered — quick block, no config. */
export interface NationalMottoBlock {
  id: string;
  type: "nationalMotto";
}

export type ReportCardBlock =
  | FieldRowBlock
  | AverageBlock
  | CommentBlock
  | SignatureBlock
  | DividerBlock
  | LetterheadBlock
  | NationalMottoBlock
  | ScoreTableBlock;

export interface ReportCardTemplateRow {
  id: string;
  teacherId: string;
  name: string;
  blocks: ReportCardBlock[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
