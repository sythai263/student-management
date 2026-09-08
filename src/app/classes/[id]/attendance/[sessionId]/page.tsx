import { AttendanceBoard } from "@components/attendance";

interface AttendanceSessionPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

// Route protection is handled globally by src/proxy.ts (updateSession).
export default async function AttendanceSessionPage({
  params,
}: AttendanceSessionPageProps) {
  const { sessionId } = await params;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Kết quả điểm danh</h1>
      <AttendanceBoard sessionId={sessionId} />
    </main>
  );
}
