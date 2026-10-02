import { requireTeacher } from "@lib/actions/action-utils";
import { SubjectClassList } from "@components/subjects";
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
      <SubjectClassList
        classSubjects={classSubjects}
        subjectId={id}
        subject={subject}
      />
    </main>
  );
}
