import { notFound } from "next/navigation";
import { PageHeader } from "@components/layout";
import { TemplateBuilder } from "@components/report-cards";
import { requireTeacher } from "@lib/actions/action-utils";
import type { ReportCardTemplateRow } from "@types";

interface EditReportCardTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReportCardTemplatePage({
  params,
}: EditReportCardTemplatePageProps) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();

  const { data } = await supabase
    .from("reportCardTemplates")
    .select("*")
    .eq("id", id)
    .eq("teacherId", user.id)
    .single();

  if (!data) notFound();

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <PageHeader title="Sửa mẫu phiếu điểm" />
      <TemplateBuilder template={data as ReportCardTemplateRow} />
    </main>
  );
}
