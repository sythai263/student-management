"use client";

import { useState } from "react";
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

interface PlayerNameFormProps {
  onSubmit: (name: string) => void;
}

/** Name entry shown when a player lands on /play/[sessionId] directly. */
export function PlayerNameForm({ onSubmit }: PlayerNameFormProps) {
  const [name, setName] = useState("");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Tham gia phòng</CardTitle>
          <CardDescription>Nhập tên hiển thị của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(name);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="player-name">Tên hiển thị</Label>
              <Input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Vào phòng
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
