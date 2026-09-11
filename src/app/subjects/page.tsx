import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  CreateSubjectForm,
  SubjectList,
  SubjectCatalogForm,
} from "@components/subjects";

export default function SubjectsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại trang chủ
      </Link>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Môn học</h1>
        <CreateSubjectForm />
      </header>
      <SubjectCatalogForm />
      <SubjectList />
    </main>
  );
}
