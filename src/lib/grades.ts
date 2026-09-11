import { createSupabaseServerClient } from "@lib/supabase";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Ensure every student in a class has an empty grade row for each class
 * subject and for both semesters. Uses upsert with ignoreDuplicates so it
 * is safe to call repeatedly (e.g. on student import updates).
 */
export async function initializeGradesForClassStudents(
  supabase: SupabaseClient,
  classId: string,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;

  const { data: classSubjects, error: classSubjectsError } = await supabase
    .from("classSubjects")
    .select("subjectId")
    .eq("classId", classId);
  if (classSubjectsError) throw new Error(classSubjectsError.message);

  const subjectIds = (classSubjects ?? []).map((c) => c.subjectId as string);
  if (subjectIds.length === 0) return;

  const semesters = [1, 2] as const;
  const rows = [] as {
    classId: string;
    subjectId: string;
    semester: number;
    studentId: string;
  }[];

  for (const studentId of studentIds) {
    for (const subjectId of subjectIds) {
      for (const semester of semesters) {
        rows.push({ classId, subjectId, semester, studentId });
      }
    }
  }

  const { error } = await supabase.from("grades").upsert(rows, {
    onConflict: '"classId","subjectId","semester","studentId"',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
}
