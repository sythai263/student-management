import type { AttendanceStatus, ScoreType } from "@constants";

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
  studentId: string;
  subjectId: string;
  classId: string;
  semester: number;
  scoreType: ScoreType;
  score: number;
  weight: number;
  note: string | null;
  createdAt: string;
}

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  createdAt: string;
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
