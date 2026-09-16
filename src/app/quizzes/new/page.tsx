import { PageHeader } from "@components/layout";
import { QuizEditor } from "@components/quiz";

export default function NewQuizPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Tạo quiz mới" />
      <QuizEditor />
    </main>
  );
}
