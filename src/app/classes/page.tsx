import { PageHeader } from "@components/layout";
import { CreateClassForm, ClassList } from "@components/classes";

// Route protection is handled globally by src/proxy.ts (updateSession).
export default function ClassesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Lớp học của tôi" actions={<CreateClassForm />} />
      <ClassList />
    </main>
  );
}
