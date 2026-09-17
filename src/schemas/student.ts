import { z } from "zod";

/** Validation for the "Register New Student" server action input. */
export const registerStudentSchema = z.object({
  studentCode: z.string().trim().min(1, "Mã học sinh không được trống").optional(),
  lastName: z.string().trim().min(1, "Họ không được trống"),
  firstName: z.string().trim().min(1, "Tên không được trống"),
  nameSuffix: z.string().trim().max(10).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh chưa đúng (ví dụ: 2010-03-15)")
    .optional(),
  classId: z.uuid("Lớp học không hợp lệ"),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;

/** Validation for the "Update Student" server action input. */
export const updateStudentSchema = z.object({
  studentId: z.uuid("Học sinh không hợp lệ"),
  lastName: z.string().trim().min(1, "Họ không được trống"),
  firstName: z.string().trim().min(1, "Tên không được trống"),
  nameSuffix: z.string().trim().max(10).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh chưa đúng (ví dụ: 2010-03-15)")
    .optional(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
