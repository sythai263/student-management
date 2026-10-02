import type { GradeSlot } from "@constants";
import type { Student } from "./student";

export interface Grade {
  id: string;
  classId: string;
  subjectId: string;
  semester: number;
  studentId: string;
  tx1: number | null;
  tx2: number | null;
  tx3: number | null;
  tx4: number | null;
  gk: number | null;
  ck: number | null;
  averageScore: number | null;
  note: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradeWeight {
  slot: string;
  weight: number;
  label: string;
  fullLabel: string;
}

/** Row of the studentGradeSummaries statistics view. */
export interface StudentGradeSummary {
  studentId: string;
  subjectId: string;
  classId: string;
  semester: number;
  averageScore: number;
  gradeCount: number;
}

/** One honor-roll row — ranked by weighted count of high (>= 9) scores. */
export interface HonorRollEntry {
  studentId: string;
  studentCode: string | null;
  studentName: string;
  /** Number of >= 9 scores across tx1..tx4 (weight 1 each). */
  tx9: number;
  /** 1 if gk >= 9 (weight 2). */
  gk9: number;
  /** 1 if ck >= 9 (weight 3). */
  ck9: number;
  /** Weighted total: tx9 * 1 + gk9 * 2 + ck9 * 3. */
  score: number;
}

export interface GradeWithStudent extends Grade {
  students: Pick<
    Student,
    "studentCode" | "lastName" | "firstName" | "nameSuffix"
  > | null;
}

export interface ImportGradesError {
  lineNo: number;
  studentCode: string | null;
  message: string;
}

export interface ImportGradesSummary {
  inserted: number;
  skipped: number;
  errors: ImportGradesError[];
}

export interface CsvMappedRow {
  lineNo: number;
  studentCode: string | null;
  fullName: string | null;
  scores: Record<GradeSlot, number | null>;
  invalidScores: GradeSlot[];
  note: string | null;
  comment: string | null;
}

export interface ParseGradeCsvResult {
  hasHeader: boolean;
  rows: CsvMappedRow[];
}
