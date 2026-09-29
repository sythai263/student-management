import { z } from "zod";

/** Validation for the "Record Violations" server action input. */
export const createViolationsSchema = z.object({
  classId: z.string().uuid("Lớp học không hợp lệ"),
  studentIds: z
    .array(z.string().uuid("Học sinh không hợp lệ"))
    .min(1, "Chọn ít nhất một học sinh"),
  content: z
    .string()
    .trim()
    .min(1, "Nội dung vi phạm không được trống")
    .max(500, "Nội dung vi phạm tối đa 500 ký tự"),
  recordedAt: z
    .string()
    .min(1, "Chưa chọn thời điểm ghi nhận")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Ngày giờ không hợp lệ"),
});

export const deleteViolationSchema = z.string().uuid("Bản ghi không hợp lệ");

export type CreateViolationsInput = z.infer<typeof createViolationsSchema>;
