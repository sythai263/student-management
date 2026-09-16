export {
  useClasses,
  useClass,
  useDeleteClass,
  useUpdateClassSchool,
} from "./classes";
export {
  useSchools,
  useCreateSchool,
  useRenameSchool,
  useDeleteSchool,
} from "./schools";
export { useStudents, usePaginatedStudents } from "./students";
export { useSubjects, useCreateSubject, useDeleteSubject, useSubjectCatalog } from "./subjects";
export {
  useClassSubjects,
  useAssignClassSubject,
  useRemoveClassSubject,
} from "./class-subjects";
export {
  useGrades,
  useSaveGrades,
  useSaveGradeComment,
  useImportGrades,
} from "./grades";
export type { GradeWithStudent } from "@types";
export { useDebounce } from "./use-debounce";
export {
  useTeacherSignature,
  useSaveSignature,
  useDeleteSignature,
} from "./signature";
export {
  useReportCardTemplates,
  useReportCardTemplate,
  useSaveReportCardTemplate,
  useDeleteReportCardTemplate,
  useSetDefaultReportCardTemplate,
} from "./report-card-templates";
export {
  useAttendanceSession,
  useAttendanceSessions,
  useAttendanceRecords,
  useUpdateAttendance,
  useCloseSession,
  useCreateSession,
  useRenameSession,
  useDeleteSession,
} from "./attendance";
export type { AttendanceRecordWithStudent } from "@types";
export { useQuizzes, useQuiz, useSaveQuiz, useDeleteQuiz } from "./quizzes";
