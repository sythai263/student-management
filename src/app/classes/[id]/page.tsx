import Link from "next/link";
import { CalendarCheck, Dices, GraduationCap, Printer, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireTeacher } from "@lib/actions/action-utils";
import { ClassHeader, ClassSubjectManager } from "@components/classes";
import { StudentTable, ImportStudentsForm } from "@components/students";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Route protection is handled globally by src/proxy.ts (updateSession).
export default async function ClassDetailPage({
  params,
  searchParams,
}: ClassDetailPageProps) {
  const { id } = await params;
  const { subjectId } = await searchParams;
  const activeSubjectId = typeof subjectId === "string" ? subjectId : undefined;

  let subjectName: string | undefined;

  if (activeSubjectId) {
    const { supabase, user } = await requireTeacher();
    const { data } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", activeSubjectId)
      .eq("teacherId", user.id)
      .single();
    subjectName = data?.name;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <ClassHeader classId={id} />

      {activeSubjectId && subjectName ? (
        <p className="rounded-md border p-2 text-sm font-medium">
          Môn đang chọn: {subjectName}
        </p>
      ) : (
        <ClassSubjectManager classId={id} />
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/classes/${id}/students/new`}
          className={buttonVariants({ variant: "default" })}
        >
          <UserPlus /> Đăng ký học sinh
        </Link>
        <ImportStudentsForm classId={id} />
        <Link
          href={`/classes/${id}/attendance`}
          className={buttonVariants({ variant: "outline" })}
        >
          <CalendarCheck /> Buổi điểm danh
        </Link>
        <Link
          href={
            activeSubjectId
              ? `/classes/${id}/grades?subjectId=${activeSubjectId}`
              : `/classes/${id}/grades`
          }
          className={buttonVariants({ variant: "outline" })}
        >
          <GraduationCap /> Nhập điểm
        </Link>
        <Link
          href={
            activeSubjectId
              ? `/classes/${id}/report-cards?subjectId=${activeSubjectId}`
              : `/classes/${id}/report-cards`
          }
          className={buttonVariants({ variant: "outline" })}
        >
          <Printer /> Phiếu điểm
        </Link>
        <Link
          href={
            activeSubjectId
              ? `/classes/${id}/race?subjectId=${activeSubjectId}`
              : `/classes/${id}/race`
          }
          className={buttonVariants({ variant: "outline" })}
        >
          <Dices /> Kiểm tra bài
        </Link>
      </div>

      <StudentTable classId={id} />
    </main>
  );
}
