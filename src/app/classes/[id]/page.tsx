import { ClassHeader } from "@components/classes";
import {
  RegisterStudentForm,
  StudentTable,
  ImportStudentsForm,
} from "@components/students";
import { GroupAttendanceForm } from "@components/attendance";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

// Route protection is handled globally by src/proxy.ts (updateSession).
export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <ClassHeader classId={id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RegisterStudentForm classId={id} />
        <GroupAttendanceForm classId={id} />
      </div>

      <ImportStudentsForm classId={id} />
      <StudentTable classId={id} />
    </main>
  );
}
