import { ReportCardDashboard } from "@components/report-cards";
import { PageHeader } from "@components/layout";
import { requireTeacher } from "@lib/actions/action-utils";
import { getTeacherSubjectName } from "@lib/data-subjects";
import { firstParam } from "@lib/utils";

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
  const activeSubjectId = firstParam(subjectId);

  const { supabase } = await requireTeacher();
  const { data: userData } = await supabase.auth.getUser();
  const teacherName =
    (userData.user?.user_metadata?.fullName as string | undefined) ?? "";
  const subjectName = await getTeacherSubjectName(activeSubjectId);

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
