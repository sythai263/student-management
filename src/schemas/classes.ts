import { z } from "zod";

/** Validation for the "Create Class" server action input. */
export const createClassSchema = z.object({
  classCode: z
    .string()
    .trim()
    .min(1, "Mã lớp không được trống")
    .max(20, "Mã lớp tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9]+$/, "Mã lớp chỉ gồm chữ và số"),
  name: z.string().trim().min(1, "Tên lớp không được trống"),
  schoolYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Năm học theo định dạng YYYY-YYYY"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

/** Validation for the class id used when deleting a class. */
export const deleteClassSchema = z
  .string()
  .uuid("ID lớp không hợp lệ");
