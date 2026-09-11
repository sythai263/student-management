import {
  CreateSubjectForm,
  SubjectCatalogForm,
  SubjectList,
} from "@components/subjects";

export default function SubjectsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Môn học</h1>
        <CreateSubjectForm />
      </header>
      <SubjectCatalogForm />
      <SubjectList />
    </main>
  );
}
