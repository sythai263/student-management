import { ReportCardDashboard } from "@components/report-cards";
import { PageHeader } from "@components/layout";
import { requireTeacher } from "@lib/actions/action-utils";

interface ReportCardsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReportCardsPage({
  params,
  searchParams,
}: ReportCardsPageProps) {
  const { id } = await params;
  const { subjectId } = await searchParams;
  const activeSubjectId = typeof subjectId === "string" ? subjectId : undefined;

  const { supabase, user } = await requireTeacher();
  const { data: userData } = await supabase.auth.getUser();
  const teacherName =
    (userData.user?.user_metadata?.fullName as string | undefined) ?? "";

  let subjectName: string | undefined;

  if (activeSubjectId) {
    const { data } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", activeSubjectId)
      .eq("teacherId", user.id)
      .single();
    subjectName = data?.name;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8 print:max-w-none print:p-0">
      <PageHeader title="Phiếu điểm" />
      <ReportCardDashboard
        classId={id}
        subjectId={activeSubjectId}
        subjectName={subjectName}
        teacherName={teacherName}
      />
    </main>
  );
}
