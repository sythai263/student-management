import { AttendanceBoard } from "@components/attendance";
import { PageHeader } from "@components/layout";
import { createSupabaseServerClient } from "@lib/supabase";
import { friendlyErrorMessage } from "@lib/utils";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

interface AttendanceSessionPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

// Route protection is handled globally by src/proxy.ts (updateSession).
export default async function AttendanceSessionPage({
  params,
}: AttendanceSessionPageProps) {
  const { sessionId } = await params;
  const queryClient = new QueryClient();
  const supabase = await createSupabaseServerClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["session", sessionId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("attendanceSessions")
          .select(
            "id, \"classId\", \"sessionDate\", name, imageKeys, closed, createdAt",
          )
          .eq("id", sessionId)
          .single();
        if (error) throw new Error(friendlyErrorMessage(error));
        return data;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["attendance", sessionId, "ALL"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("attendanceRecords")
          .select(
            "id, status, note, sessionId, \"studentId\", confidence, students!inner(studentCode, lastName, firstName)",
          )
          .eq("sessionId", sessionId);
        if (error) throw new Error(friendlyErrorMessage(error));
        return data ?? [];
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <PageHeader title="Kết quả điểm danh" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AttendanceBoard sessionId={sessionId} />
      </HydrationBoundary>
    </main>
  );
}
