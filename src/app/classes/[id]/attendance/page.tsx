import { AttendanceActions, SessionList } from "@components/attendance";

interface AttendancePageProps {
  params: Promise<{ id: string }>;
}

export default async function AttendancePage({ params }: AttendancePageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <AttendanceActions classId={id} />
      <SessionList classId={id} />
    </main>
  );
}
