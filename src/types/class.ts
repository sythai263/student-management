/** Row types mirroring the Supabase schema (camelCase columns). */

export interface Class {
  id: string;
  classCode: string;
  name: string;
  schoolYear: string;
  teacherId: string;
  /** Optional FK to `teacherSchools` — the school this class belongs to. */
  schoolId: string | null;
  /** Embedded join (`school:teacherSchools(name)`) — present when selected. */
  school?: { name: string } | null;
  /** Embedded join (`classSubjects(subjectId, subjects(name, code))`) —
   *  present when selected. One class can belong to many subjects. */
  classSubjects?: {
    subjectId: string;
    subjects: { name: string; code: string | null } | null;
  }[];
  createdAt: string;
}
