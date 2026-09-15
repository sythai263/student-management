import { PageHeader } from "@components/layout";
import { TemplateBuilder } from "@components/report-cards";

export default function NewReportCardTemplatePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <PageHeader title="Tạo mẫu phiếu điểm" />
      <TemplateBuilder />
    </main>
  );
}
