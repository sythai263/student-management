import { ClassList } from "@components/classes";

// Route protection is handled globally by src/proxy.ts (updateSession).
export default function ClassesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <ClassList />
    </main>
  );
}
