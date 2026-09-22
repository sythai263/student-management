export {
  registerStudentSchema,
  updateStudentSchema,
  deleteStudentSchema,
} from "./student";
export type { RegisterStudentInput, UpdateStudentInput } from "./student";
export {
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "./auth";
export type {
  LoginInput,
  SendOtpInput,
  VerifyOtpInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from "./auth";
export { createSubjectSchema, createSubjectsFromCatalogSchema } from "./subjects";
export type { CreateSubjectInput, CreateSubjectsFromCatalogInput } from "./subjects";
export {
  updateRecordSchema,
  renameSessionSchema,
  addRecordSchema,
} from "./attendance";
export type {
  UpdateAttendanceInput,
  RenameSessionInput,
  AddAttendanceInput,
} from "./attendance";
export {
  createClassSchema,
  deleteClassSchema,
  updateClassSchoolSchema,
} from "./classes";
export type { CreateClassInput } from "./classes";
export { createSchoolSchema, renameSchoolSchema } from "./schools";
export type { CreateSchoolInput, RenameSchoolInput } from "./schools";
