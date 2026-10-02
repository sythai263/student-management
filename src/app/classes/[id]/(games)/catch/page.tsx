import { pickReviewStudent } from "@lib/actions";
import { firstParam } from "@lib/utils";
import { DuckCatchCanvas } from "@components/duck-race";

interface CatchPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatchPage({
  params,
  searchParams,
}: CatchPageProps) {
  const { id } = await params;
  const { subjectId } = await searchParams;
  const activeSubjectId = firstParam(subjectId);

  const result = await pickReviewStudent(id);

  if (!result.success) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <DuckCatchCanvas
      classId={id}
      subjectId={activeSubjectId}
      students={result.data.students}
      winnerId={result.data.winnerId}
    />
  );
}
