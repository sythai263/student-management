import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GradeDashboard } from "@components/grades";
import { requireTeacher } from "@lib/actions/action-utils";

interface GradesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GradesPage({
  params,
  searchParams,
}: GradesPageProps) {
  const { id } = await params;
  const { subjectId } = await searchParams;
  const activeSubjectId = typeof subjectId === "string" ? subjectId : undefined;

  let subjectName: string | undefined;
  let backHref = `/classes/${id}`;
  let backLabel = "Quay lại lớp học";

  if (activeSubjectId) {
    const { supabase, user } = await requireTeacher();
    const { data } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", activeSubjectId)
      .eq("teacherId", user.id)
      .single();
    subjectName = data?.name;
    backHref = `/subjects/${activeSubjectId}`;
    backLabel = "Quay lại môn học";
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <Link
        href={backHref}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> {backLabel}
      </Link>
      <GradeDashboard
        classId={id}
        subjectId={activeSubjectId}
        subjectName={subjectName}
      />
    </main>
  );
}
