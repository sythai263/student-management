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
