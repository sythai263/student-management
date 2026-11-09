import dayjs from "dayjs";
import { Activity } from "lucide-react";
import { getLastKeepAlivePing } from "@lib/data-keep-alive";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";

// Always render fresh — this page exists to show the latest heartbeat.
export const dynamic = "force-dynamic";

export default async function PingPage() {
  const lastPingedAt = await getLastKeepAlivePing();

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Keep-alive
          </CardTitle>
          <CardDescription>
            Heartbeat giữ database Supabase không bị tạm dừng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lastPingedAt ? (
            <>
              <p className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-emerald-500" />
                Đang hoạt động
              </p>
              <p className="text-muted-foreground text-sm">
                Cập nhật gần nhất:{" "}
                <time dateTime={lastPingedAt} className="text-foreground">
                  {dayjs(lastPingedAt).format("HH:mm:ss · DD/MM/YYYY")}
                </time>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Chưa có lượt ping nào — hãy trỏ cron-job.org tới /api/ping.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
