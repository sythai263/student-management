import { Button } from "@/components/ui/button";
import { logout } from "@lib/actions";
import { CreateClassForm, ClassList } from "@components/classes";

// Route protection is handled globally by src/proxy.ts (updateSession).
export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lớp học của tôi</h1>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Đăng xuất
          </Button>
        </form>
      </header>

      <CreateClassForm />
      <ClassList />
    </main>
  );
}
