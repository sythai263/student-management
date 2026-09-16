"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveQuiz, useQuiz } from "@hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quiz, QuizQuestion } from "@types";
import type { QuizQuestionInput } from "@schemas";

/** Loads an existing quiz then renders the editor — used by /quizzes/[id]. */
export function QuizEditorLoader({ quizId }: { quizId: string }) {
  const { data, isLoading, error } = useQuiz(quizId);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error?.message ?? "Không tìm thấy quiz"}
      </p>
    );
  }
  return <QuizEditor quiz={data.quiz} questions={data.questions} />;
}

const TIME_LIMITS = [10, 15, 20, 30, 45, 60, 90, 120];
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

interface QuizEditorProps {
  quiz?: Quiz;
  questions?: QuizQuestion[];
}

function emptyQuestion(): QuizQuestionInput {
  return { text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 };
}

export function QuizEditor({ quiz, questions }: QuizEditorProps) {
  const router = useRouter();
  const saveMutation = useSaveQuiz();
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [items, setItems] = useState<QuizQuestionInput[]>(
    questions?.length
      ? questions.map((q) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        timeLimit: q.timeLimit,
      }))
      : [emptyQuestion()],
  );

  function updateQuestion(index: number, patch: Partial<QuizQuestionInput>) {
    setItems((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setItems((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) }
          : q,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(
      { id: quiz?.id, title, description, questions: items },
      {
        onSuccess: () => {
          toast.success("Đã lưu quiz");
          router.push("/quizzes");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quiz-title">Tên quiz</Label>
          <Input
            id="quiz-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Ôn tập Toán chương 1"
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quiz-desc">Mô tả (tuỳ chọn)</Label>
          <Input
            id="quiz-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>

      {items.map((q, qi) => (
        <Card key={qi}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Câu {qi + 1}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Xóa câu ${qi + 1}`}
              disabled={items.length <= 1}
              onClick={() =>
                setItems((prev) => prev.filter((_, i) => i !== qi))
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={q.text}
              onChange={(e) => updateQuestion(qi, { text: e.target.value })}
              placeholder="Nội dung câu hỏi"
              required
              maxLength={500}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={q.correctIndex === oi ? "default" : "outline"}
                    size="icon-sm"
                    aria-label={`Chọn ${OPTION_LABELS[oi]} là đáp án đúng`}
                    title="Đánh dấu đáp án đúng"
                    onClick={() => updateQuestion(qi, { correctIndex: oi })}
                  >
                    {OPTION_LABELS[oi]}
                  </Button>
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Đáp án ${OPTION_LABELS[oi]}`}
                    required
                    maxLength={200}
                  />
                  {q.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Xóa đáp án ${OPTION_LABELS[oi]}`}
                      onClick={() =>
                        updateQuestion(qi, {
                          options: q.options.filter((_, j) => j !== oi),
                          correctIndex:
                            q.correctIndex === oi
                              ? 0
                              : q.correctIndex > oi
                                ? q.correctIndex - 1
                                : q.correctIndex,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={q.options.length >= 6}
                onClick={() =>
                  updateQuestion(qi, { options: [...q.options, ""] })
                }
              >
                <Plus className="size-4" /> Thêm đáp án
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor={`tl-${qi}`} className="text-muted-foreground">
                  Thời gian
                </Label>
                <Select
                  value={String(q.timeLimit)}
                  onValueChange={(v) =>
                    updateQuestion(qi, { timeLimit: Number(v) })
                  }
                >
                  <SelectTrigger id={`tl-${qi}`} className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_LIMITS.map((t) => (
                      <SelectItem key={t} value={String(t)}>
                        {t}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setItems((prev) => [...prev, emptyQuestion()])}
        >
          <Plus className="size-4" /> Thêm câu hỏi
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Đang lưu..." : "Lưu quiz"}
        </Button>
      </div>
    </form>
  );
}
