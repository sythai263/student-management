import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@lib/supabase";
import { logout } from "@lib/actions";
import { CreateClassForm, ClassList } from "@components/classes";

export default async function DashboardPage() {
  // Auth guard only — data fetching lives in client hooks (@hooks).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
