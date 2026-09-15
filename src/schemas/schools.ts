import { z } from "zod";

/** Validation for the "Create School" server action input. */
export const createSchoolSchema = z.object({
  name: z.string().trim().min(1, "Tên trường không được trống").max(200),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

/** Validation for renaming a school. */
export const renameSchoolSchema = z.object({
  id: z.string().uuid("Trường không hợp lệ"),
  name: z.string().trim().min(1, "Tên trường không được trống").max(200),
});

export type RenameSchoolInput = z.infer<typeof renameSchoolSchema>;
