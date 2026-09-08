import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportStudentsForm } from "@components/students";

interface ImportStudentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ImportStudentsPage({
  params,
}: ImportStudentsPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <Link
        href={`/classes/${id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại lớp học
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Import học sinh</CardTitle>
          <CardDescription>
            Tải lên file CSV để thêm nhiều học sinh cùng lúc
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportStudentsForm classId={id} />
        </CardContent>
      </Card>
    </main>
  );
}
