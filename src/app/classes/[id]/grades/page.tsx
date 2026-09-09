import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GradeDashboard } from "@components/grades";

interface GradesPageProps {
  params: Promise<{ id: string }>;
}

export default async function GradesPage({ params }: GradesPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <Link
        href={`/classes/${id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại lớp học
      </Link>
      <GradeDashboard classId={id} />
    </main>
  );
}
