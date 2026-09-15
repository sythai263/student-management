import type { GradeSlot } from "@constants";
import type { ReportCardFieldValues } from "@types";

/** One student's raw data for a report card — before formatting into display strings. */
export interface ReportCardData {
  studentCode: string;
  studentName: string;
  classCode: string;
  className: string;
  /** School the class is mapped to — empty string when unmapped. */
  schoolName: string;
  subjectName: string;
  semesterLabel: string;
  scores: Record<GradeSlot, number | null>;
  average: number | null;
  comment: string | null;
}

function formatScore(value: number | null): string {
  return value == null ? "—" : String(value);
}

function formatAverage(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}

/** Map raw report card data into the fixed field catalogue, ready to bind into blocks. */
export function buildFieldValues(
  data: ReportCardData,
  signDate: string,
  teacherName: string,
): ReportCardFieldValues {
  return {
    subjectName: data.subjectName,
    studentName: data.studentName,
    studentCode: data.studentCode,
    classCode: data.classCode,
    className: data.className,
    schoolName: data.schoolName,
    semesterLabel: data.semesterLabel,
    tx1: formatScore(data.scores.tx1),
    tx2: formatScore(data.scores.tx2),
    tx3: formatScore(data.scores.tx3),
    tx4: formatScore(data.scores.tx4),
    gk: formatScore(data.scores.gk),
    ck: formatScore(data.scores.ck),
    average: formatAverage(data.average),
    comment: data.comment || "",
    signDate,
    teacherName,
  };
}
