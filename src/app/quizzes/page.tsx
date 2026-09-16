import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@components/layout";
import { QuizList } from "@components/quiz";

export default function QuizzesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader
        title="Quiz"
        actions={
          <Link href="/quizzes/new" className={buttonVariants()}>
            <Plus className="size-4" /> Tạo quiz
          </Link>
        }
      />
      <QuizList />
    </main>
  );
}
