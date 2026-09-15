import { PageHeader } from "@components/layout";
import { SubjectCatalogForm, SubjectList } from "@components/subjects";

// Route protection is handled globally by src/proxy.ts (updateSession).
export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Môn học của tôi" actions={<SubjectCatalogForm />} />

      <SubjectList />
    </main>
  );
}
