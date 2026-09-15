import { PageHeader } from "@components/layout";
import { RegisterStudentForm } from "@components/students";

interface RegisterStudentPageProps {
  params: Promise<{ id: string }>;
}

export default async function RegisterStudentPage({
  params,
}: RegisterStudentPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <PageHeader title="Đăng ký học sinh" />
      <RegisterStudentForm classId={id} />
    </main>
  );
}
