import { PageHeader } from "@components/layout";
import { QuizEditorLoader } from "@components/quiz";

interface EditQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuizPage({ params }: EditQuizPageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Chỉnh sửa quiz" />
      <QuizEditorLoader quizId={id} />
    </main>
  );
}
