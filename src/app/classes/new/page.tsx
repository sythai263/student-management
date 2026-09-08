import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateClassForm } from "@components/classes";

// Route protection is handled globally by src/proxy.ts (updateSession).
// The new class is owned by the logged-in teacher (teacherId = auth.uid()).
export default function NewClassPage() {
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
