import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@components/layout";
import { CreateClassForm } from "@components/classes";

// Route protection is handled globally by src/proxy.ts (updateSession).
// The new class is owned by the logged-in teacher (teacherId = auth.uid()).
export default function NewClassPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <PageHeader title="Tạo lớp mới" />
      <div className="flex justify-center">
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
      </div>
    </main>
  );
}
