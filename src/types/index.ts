import type { AttendanceStatus, GradeSlot } from "@constants";

/** Row types mirroring the Supabase schema (camelCase columns). */

export interface Class {
  id: string;
  classCode: string;
  name: string;
  schoolYear: string;
  teacherId: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentCode: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
  classId: string;
  awsFaceId: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  sessionDate: string;
  imageUrls: string[];
  closed: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  confidence: number | null;
  note: string | null;
  createdAt: string;
}

export interface Subject {
  id: string;
  teacherId: string;
  name: string;
  code: string | null;
  createdAt: string;
}

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

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  createdAt: string;
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

export interface RaceState {
  speeds: number[][];
  positions: number[];
  trackLength: number;
  winnerName: string;
}

export interface DuckRaceData {
  students: Student[];
  winnerId: string;
}

export interface GradeWithStudent extends Grade {
  students: Pick<Student, "studentCode" | "lastName" | "firstName"> | null;
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
