"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <Badge key={p.playerId} variant="secondary">
              {p.name}
            </Badge>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Đang chờ học sinh tham gia...
            </p>
          )}
        </div>
        <div className="flex justify-center">
          <Button size="lg" onClick={onStart}>
            Bắt đầu ({totalQuestions} câu hỏi)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
