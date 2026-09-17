import type { AttendanceStatus } from "@constants";
import type { Student } from "./student";

export interface AttendanceSession {
  id: string;
  classId: string;
  sessionDate: string;
  name: string | null;
  imageKeys: string[];
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

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  students: Pick<
    Student,
    "studentCode" | "lastName" | "firstName" | "nameSuffix"
  > | null;
}

export interface GroupAttendanceSummary {
  sessionId: string;
  presentCount: number;
  totalCount: number;
}
