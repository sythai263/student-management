import { z } from "zod";
import { ATTENDANCE_STATUS } from "@constants";

/** Validation for the "Update Attendance Record" server action input. */
export const updateRecordSchema = z
  .object({
    recordId: z.uuid("Dữ liệu điểm danh không hợp lệ"),
    status: z.enum([
      ATTENDANCE_STATUS.PRESENT,
      ATTENDANCE_STATUS.ABSENT,
      ATTENDANCE_STATUS.EXCUSED,
      ATTENDANCE_STATUS.SKIPPED,
      ATTENDANCE_STATUS.LATE,
    ]),
    note: z.string().trim().optional(),
  })
  .refine((v) => v.status !== ATTENDANCE_STATUS.EXCUSED || !!v.note, {
    message: "Vắng có phép cần nhập lý do",
    path: ["note"],
  });

export type UpdateAttendanceInput = z.infer<typeof updateRecordSchema>;

/** Validation for the "Rename Attendance Session" server action input. */
export const renameSessionSchema = z.object({
  sessionId: z.uuid("Buổi điểm danh không hợp lệ"),
  name: z.string().trim().min(1, "Tên buổi không được trống").max(120),
});

export type RenameSessionInput = z.infer<typeof renameSessionSchema>;
