import { Activity } from "lucide-react";
import { pingKeepAlive } from "@lib/data-keep-alive";
import { LocalTime } from "@components/ping";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";

// Always render fresh — every visit also bumps the keepAlive row, so
// this page doubles as a browser-cron heartbeat like /api/ping.
export const dynamic = "force-dynamic";

export default async function PingPage() {
  const lastPingedAt = await pingKeepAlive();

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Trạng thái
          </CardTitle>
          <CardDescription>Trạng thái hoạt động của hệ thống</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full bg-emerald-500" />
            Đang hoạt động
          </p>
          <LocalTime
            iso={lastPingedAt}
            className="text-muted-foreground block text-sm"
          />
        </CardContent>
      </Card>
    </main>
  );
}
