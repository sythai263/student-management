import type { Student } from "./student";

/** A recorded class-rule violation for one student. */
export interface StudentViolation {
  id: string;
  classId: string;
  studentId: string;
  /** Free-text violation description, optionally built from quick presets. */
  content: string;
  /** When the teacher recorded it (teacher machine time). */
  recordedAt: string;
  createdAt: string;
}

export interface StudentViolationWithStudent extends StudentViolation {
  students: Pick<
    Student,
    "studentCode" | "lastName" | "firstName" | "nameSuffix"
  > | null;
}

/** Row returned by the count_violations_by_student RPC. */
export interface ViolationStat {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  violationCount: number;
}
