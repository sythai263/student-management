import { GradeDashboard } from "@components/grades";
import { PageHeader } from "@components/layout";
import { requireTeacher } from "@lib/actions/action-utils";

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
  const activeSubjectId = typeof subjectId === "string" ? subjectId : undefined;

  let subjectName: string | undefined;

  if (activeSubjectId) {
    const { supabase, user } = await requireTeacher();
    const { data } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", activeSubjectId)
      .eq("teacherId", user.id)
      .single();
    subjectName = data?.name;
  }

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
