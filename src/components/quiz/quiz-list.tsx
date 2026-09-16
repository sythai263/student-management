"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createQuizSession } from "@lib/actions";
import { useQuizzes, useDeleteQuiz } from "@hooks";
import type { Quiz } from "@types";

export function QuizList() {
  const router = useRouter();
  const { data: quizzes, isLoading, error } = useQuizzes();
  const deleteQuizMutation = useDeleteQuiz();
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [hostingId, setHostingId] = useState<string | null>(null);

  async function handleHost(quizId: string) {
    setHostingId(quizId);
    const result = await createQuizSession(quizId);
    setHostingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.push(`/quizzes/host/${result.data.sessionId}`);
  }

  if (isLoading) {
    return <CardGridSkeleton />;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  if (!quizzes?.length) {
    return <p className="text-muted-foreground">Chưa có quiz nào.</p>;
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        {quizzes.map((q) => (
          <Card key={q.id} className="relative transition-colors hover:border-primary">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/quizzes/${q.id}`} className="group min-w-0">
                  <CardTitle className="truncate">{q.title}</CardTitle>
                  <CardDescription>{q.description ?? "—"}</CardDescription>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Tạo phòng cho ${q.title}`}
                    disabled={hostingId === q.id}
                    onClick={() => handleHost(q.id)}
                  >
                    <Play className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xóa quiz ${q.title}`}
                    onClick={() => setQuizToDelete(q)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Dialog
        open={quizToDelete !== null}
        onOpenChange={(open) => !open && setQuizToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa quiz</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa quiz <strong>{quizToDelete?.title}</strong>?
              Các câu hỏi và kết quả phòng chơi liên quan sẽ bị xóa theo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuizToDelete(null)}
              disabled={deleteQuizMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (quizToDelete) {
                  deleteQuizMutation.mutate(quizToDelete.id, {
                    onSuccess: () => {
                      toast.success("Đã xóa quiz");
                      setQuizToDelete(null);
                    },
                    onError: (err) => toast.error(err.message),
                  });
                }
              }}
              disabled={deleteQuizMutation.isPending}
            >
              {deleteQuizMutation.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
