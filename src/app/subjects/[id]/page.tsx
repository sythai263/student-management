import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTeacher } from "@lib/actions/action-utils";
import { CreateClassForm } from "@components/classes";
import type { ClassSubjectWithClass, Subject } from "@types";

interface SubjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectDetailPage({
  params,
}: SubjectDetailPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();

  const [subjectRes, classSubjectsRes] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code")
      .eq("id", id)
      .eq("teacherId", user.id)
      .single(),
    supabase
      .from("classSubjects")
      .select("id, classId, classes(name, classCode, schoolYear)")
      .eq("subjectId", id)
      .order("createdAt", { ascending: true }),
  ]);

  if (subjectRes.error || !subjectRes.data) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-destructive">Không tìm thấy môn học.</p>
      </main>
    );
  }

  const subject = subjectRes.data as Subject;
  const classSubjects = (classSubjectsRes.data ?? []).map((c) => ({
    ...c,
    classes: Array.isArray(c.classes) ? (c.classes[0] ?? null) : c.classes,
  })) as ClassSubjectWithClass[];

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <Link
        href="/subjects"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại môn học
      </Link>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {subject.name} {subject.code ? `(${subject.code})` : ""}
          </h1>
          <p className="text-muted-foreground">
            Danh sách lớp đang dạy môn này
          </p>
        </div>
        <CreateClassForm subjectId={id} />
      </header>

      {classSubjects.length === 0 ? (
        <p className="text-muted-foreground">
          Môn này chưa được gán vào lớp nào.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classSubjects.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.classId}?subjectId=${id}`}
              className="group"
            >
              <Card className="transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {c.classes?.classCode ?? "—"}
                      </CardTitle>
                      <CardDescription className="space-y-0.5">
                        <div>{c.classes?.name ?? "—"}</div>
                        <div>Năm học {c.classes?.schoolYear ?? "—"}</div>
                      </CardDescription>
                    </div>
                    <GraduationCap className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
