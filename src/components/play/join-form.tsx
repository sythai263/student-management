"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinQuizByPin } from "@lib/actions";
import { savePlayerIdentity } from "@lib/quiz";

/** Public join form: PIN + display name -> /play/[sessionId]. */
export function JoinQuizForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setLoading(true);
    const result = await joinQuizByPin({ pin: pin.trim() });
    if (!result.success) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    // Persist identity BEFORE navigating so /play/[sessionId] can
    // restore it — the playerId survives refreshes and reconnects.
    savePlayerIdentity(result.data.sessionId, {
      playerId: crypto.randomUUID(),
      name: trimmedName,
    });
    router.push(`/play/${result.data.sessionId}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Vào phòng quiz</CardTitle>
          <CardDescription>Nhập mã PIN trên màn hình của thầy/cô</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Mã PIN</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                placeholder="000000"
                className="text-center font-mono text-2xl tracking-[0.5em]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tên hiển thị</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên của bạn"
                maxLength={40}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang vào..." : "Vào phòng"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
