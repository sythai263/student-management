import { z } from "zod";

/** Validation for the "Register New Student" server action input. */
export const registerStudentSchema = z.object({
  studentCode: z.string().trim().min(1, "Mã học sinh không được trống"),
  lastName: z.string().trim().min(1, "Họ không được trống"),
  firstName: z.string().trim().min(1, "Tên không được trống"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải theo định dạng YYYY-MM-DD")
    .optional(),
  classId: z.uuid("classId không hợp lệ"),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
