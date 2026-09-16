import { z } from "zod";

const uuid = z.string().uuid();

export const quizQuestionInputSchema = z
  .object({
    text: z.string().trim().min(1, "Câu hỏi không được để trống").max(500),
    options: z
      .array(z.string().trim().min(1, "Đáp án không được để trống").max(200))
      .min(2, "Cần ít nhất 2 đáp án")
      .max(6, "Tối đa 6 đáp án"),
    correctIndex: z.coerce.number().int().min(0),
    timeLimit: z.coerce
      .number()
      .int()
      .min(5, "Tối thiểu 5 giây")
      .max(120, "Tối đa 120 giây"),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "Đáp án đúng không hợp lệ",
    path: ["correctIndex"],
  });

export const saveQuizSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, "Tên quiz không được để trống").max(200),
  description: z.string().trim().max(500).optional(),
  questions: z.array(quizQuestionInputSchema).min(1, "Cần ít nhất 1 câu hỏi"),
});

export const joinQuizSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "Mã PIN gồm 6 chữ số"),
});

export const sessionIdSchema = z.object({
  sessionId: uuid,
});

export const saveQuizResultsSchema = z.object({
  sessionId: uuid,
  results: z
    .array(
      z.object({
        playerId: uuid,
        playerName: z.string().trim().min(1).max(80),
        totalScore: z.coerce.number().int().min(0),
        correctCount: z.coerce.number().int().min(0),
      }),
    )
    .max(200),
});

export type QuizQuestionInput = z.infer<typeof quizQuestionInputSchema>;
export type SaveQuizInput = z.infer<typeof saveQuizSchema>;
