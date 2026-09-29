import { GradeDashboard } from "@components/grades";
import { PageHeader } from "@components/layout";
import { getTeacherSubjectName } from "@lib/data-subjects";
import { firstParam } from "@lib/utils";

interface GradesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GradesPage({
  params,
  searchParams,
}: GradesPageProps) {
  const { id } = await params;
  const { subjectId } = await searchParams;
  const activeSubjectId = firstParam(subjectId);
  const subjectName = await getTeacherSubjectName(activeSubjectId);

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <PageHeader title="Nhập điểm" />
      <GradeDashboard
        classId={id}
        subjectId={activeSubjectId}
        subjectName={subjectName}
      />
    </main>
  );
}
