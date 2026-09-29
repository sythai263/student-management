import { requireTeacher } from "@lib/actions/action-utils";

/**
 * Resolve a subject's display name for the signed-in teacher — used by
 * pages that take `?subjectId=` and need the readable heading.
 */
export async function getTeacherSubjectName(
  subjectId: string | undefined,
): Promise<string | undefined> {
  if (!subjectId) return undefined;
  const { supabase, user } = await requireTeacher();
  const { data } = await supabase
    .from("subjects")
    .select("name")
    .eq("id", subjectId)
    .eq("teacherId", user.id)
    .single();
  return data?.name ?? undefined;
}
