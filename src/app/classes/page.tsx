import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@lib/actions";
import { CreateClassForm, ClassList } from "@components/classes";

// Route protection is handled globally by src/proxy.ts (updateSession).
export default function ClassesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Quay lại trang chủ
      </Link>

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lớp học của tôi</h1>
        <div className="flex gap-2">
          <Link
            href="/subjects"
            className={buttonVariants({ variant: "outline" })}
          >
            <BookOpen /> Môn học
          </Link>
          <form action={logout}>
            <Button variant="outline" type="submit">
              Đăng xuất
            </Button>
          </form>
        </div>
      </header>

      <CreateClassForm />
      <ClassList />
    </main>
  );
}
