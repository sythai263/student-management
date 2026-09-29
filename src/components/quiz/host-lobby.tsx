"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuizPlayerState } from "@types";

interface HostLobbyProps {
  pinCode: string;
  players: QuizPlayerState[];
  totalQuestions: number;
  onStart: () => void;
}

/** Lobby phase: shows the room PIN and the joined players. */
export function HostLobby({
  pinCode,
  players,
  totalQuestions,
  onStart,
}: HostLobbyProps) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardDescription>
          Học sinh vào đường dẫn /play và nhập mã
        </CardDescription>
        <CardTitle className="font-mono text-6xl tracking-[0.3em]">
          {pinCode}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <Button size="lg" onClick={onStart}>
            Bắt đầu ({totalQuestions} câu hỏi)
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {players.map((p) => (
            <span
              key={p.playerId}
              className="rounded-full bg-secondary px-5 py-2 text-lg font-medium text-secondary-foreground"
            >
              {p.name}
            </span>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Đang chờ học sinh tham gia...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
