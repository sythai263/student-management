import Link from "next/link";
import { CalendarCheck, GraduationCap, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ClassHeader } from "@components/classes";
import { StudentTable, ImportStudentsForm } from "@components/students";

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
          href={`/classes/${id}/grades`}
          className={buttonVariants({ variant: "outline" })}
        >
          <GraduationCap /> Nhập điểm
        </Link>
      </div>

      <StudentTable classId={id} />
    </main>
  );
}
