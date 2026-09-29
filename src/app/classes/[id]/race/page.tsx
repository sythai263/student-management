import { pickReviewStudent } from "@lib/actions";
import { firstParam } from "@lib/utils";
import { DuckRaceCanvas } from "@components/duck-race";

interface RacePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RacePage({
  params,
  searchParams,
}: RacePageProps) {
  const { id } = await params;
  const { subjectId } = await searchParams;
  const activeSubjectId = firstParam(subjectId);

  const result = await pickReviewStudent(id);

  if (!result.success) {
    return (
      <main className="flex h-screen w-screen items-center justify-center p-8">
        <p className="text-sm text-destructive">{result.error}</p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-black">
      <DuckRaceCanvas
        classId={id}
        subjectId={activeSubjectId}
        students={result.data.students}
        winnerId={result.data.winnerId}
      />
    </main>
  );
}
