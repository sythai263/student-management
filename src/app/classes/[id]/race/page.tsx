import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
      <main className="mx-auto max-w-5xl space-y-8 p-8">
        <Link
          href={`/classes/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft /> Quay lại
        </Link>
        <p className="text-sm text-destructive">{result.error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <Link
        href={`/classes/${id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại lớp học
      </Link>

      <DuckRaceCanvas
        students={result.data.students}
        winnerId={result.data.winnerId}
      />
    </main>
  );
}
