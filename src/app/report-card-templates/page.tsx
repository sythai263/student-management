import { PageHeader } from "@components/layout";
import { ReportCardTemplateList } from "@components/report-cards";

export default function ReportCardTemplatesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Mẫu phiếu điểm" />
      <ReportCardTemplateList />
    </main>
  );
}
