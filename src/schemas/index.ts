export { registerStudentSchema, updateStudentSchema } from "./student";
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
export { updateRecordSchema } from "./attendance";
export type { UpdateAttendanceInput } from "./attendance";
export { createClassSchema, deleteClassSchema } from "./classes";
export type { CreateClassInput } from "./classes";
