import { PageHeader } from "@components/layout";
import {
  CreateSubjectForm,
  SubjectCatalogForm,
  SubjectList,
} from "@components/subjects";

export default function SubjectsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Môn học" actions={<CreateSubjectForm />} />
      <SubjectCatalogForm />
      <SubjectList />
    </main>
  );
}
