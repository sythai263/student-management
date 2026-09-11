import { z } from "zod";

/** Validation for the "Create Subject" server action input. */
export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Tên môn học không được trống").max(100),
  code: z.string().trim().max(20).optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
