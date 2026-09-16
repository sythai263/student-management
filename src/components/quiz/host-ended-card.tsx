import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuizLeaderboard } from "./quiz-leaderboard";
import type { LeaderboardEntry } from "@types";

interface HostEndedCardProps {
  leaderboard: LeaderboardEntry[];
}

/** Final phase: the room is closed and results were persisted. */
export function HostEndedCard({ leaderboard }: HostEndedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bảng xếp hạng cuối cùng</CardTitle>
        <CardDescription>
          Phòng đã đóng, kết quả đã được lưu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QuizLeaderboard entries={leaderboard} />
      </CardContent>
    </Card>
  );
}
