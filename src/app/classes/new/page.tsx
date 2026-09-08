import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseServerClient } from "@lib/supabase";
import { CreateClassForm } from "@components/classes";

export default async function NewClassPage() {
  // Auth guard — the new class is owned by the logged-in teacher.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tạo lớp mới</CardTitle>
          <CardDescription>
            Lớp sẽ thuộc sở hữu của tài khoản giáo viên hiện tại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateClassForm />
        </CardContent>
      </Card>
    </main>
  );
}
