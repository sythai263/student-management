import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RegisterStudentForm } from "@components/students";

interface RegisterStudentPageProps {
  params: Promise<{ id: string }>;
}

export default async function RegisterStudentPage({
  params,
}: RegisterStudentPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <Link
        href={`/classes/${id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại lớp học
      </Link>
      <RegisterStudentForm classId={id} />
    </main>
  );
}
