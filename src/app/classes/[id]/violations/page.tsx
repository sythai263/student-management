import { PageHeader } from "@components/layout";
import { ViolationForm, ViolationList } from "@components/violations";

interface ViolationsPageProps {
  params: Promise<{ id: string }>;
}

// Route protection is handled globally by src/proxy.ts (updateSession).
export default async function ViolationsPage({ params }: ViolationsPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <PageHeader
        title="Học sinh vi phạm"
        actions={<ViolationForm classId={id} />}
      />
      <ViolationList classId={id} />
    </main>
  );
}
