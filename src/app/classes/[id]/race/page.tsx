import { pickReviewStudent } from "@lib/actions";
import { DuckRaceCanvas } from "@components/duck-race";

interface RacePageProps {
  params: Promise<{ id: string }>;
}

export default async function RacePage({ params }: RacePageProps) {
  const { id } = await params;
  const result = await pickReviewStudent(id);

  if (!result.success) {
    return (
      <main className="flex h-screen w-screen items-center justify-center p-8">
        <p className="text-sm text-destructive">{result.error}</p>
      </main>
    );
  }

  return (
    <DuckRaceCanvas
      classId={id}
      students={result.data.students}
      winnerId={result.data.winnerId}
    />
  );
}
