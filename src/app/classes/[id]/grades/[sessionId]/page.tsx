import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@lib/supabase";
import { GradeEntryGrid, ImportGradesForm } from "@components/grades";
import { SCORE_TYPE_LABEL } from "@constants";
import { notFound } from "next/navigation";

interface GradeSessionPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

interface GradeSessionWithSubject {
  id: string;
  classId: string;
  subjectId: string;
  semester: number;
  scoreType: keyof typeof SCORE_TYPE_LABEL;
  name: string;
  date: string;
  weight: number;
  closed: boolean;
  createdAt: string;
  subjects: { name: string } | null;
}

export default async function GradeSessionPage({
  params,
}: GradeSessionPageProps) {
  const { id, sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: raw, error } = await supabase
    .from("gradeSessions")
    .select("*, subjects(name)")
    .eq("id", sessionId)
    .single();

  if (error || !raw) {
    notFound();
  }

  const session = raw as unknown as GradeSessionWithSubject;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`/classes/${id}/grades`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft /> Quay lại
          </Link>
          <h1 className="text-2xl font-semibold">{session.name}</h1>
          <p className="text-muted-foreground">
            {session.subjects?.name ?? session.subjectId} ·{" "}
            {SCORE_TYPE_LABEL[session.scoreType]} · Học kỳ {session.semester} ·
            Ngày {session.date} · Hệ số {session.weight}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.closed ? (
            <Badge variant="secondary">Đã đóng</Badge>
          ) : (
            <>
              <Badge>Đang mở</Badge>
              <ImportGradesForm sessionId={sessionId} />
            </>
          )}
        </div>
      </div>

      <GradeEntryGrid
        classId={id}
        sessionId={sessionId}
        closed={session.closed}
      />
    </main>
  );
}
