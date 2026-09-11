"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Student } from "@types";

interface DuckRaceCanvasProps {
  students: Student[];
  winnerId: string;
}

const TRACK_LENGTH = 900;
const LANE_HEIGHT = 56;
const START_X = 160;
const FINISH_X = START_X + TRACK_LENGTH;
const DURATION = 45;

interface RaceState {
  speeds: number[][];
  positions: number[];
  finished: boolean;
  winnerName: string;
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function buildRace(students: Student[], winnerId: string): RaceState {
  const n = students.length;
  const winnerIndex = students.findIndex((s) => s.id === winnerId);

  const raw: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let t = 0; t < DURATION; t++) {
      row.push(randomBetween(6, 26));
    }
    raw.push(row);
  }

  const targets = students.map((_, i) => {
    if (i === winnerIndex) return TRACK_LENGTH;
    const gap = randomBetween(80, 260);
    return Math.max(0, TRACK_LENGTH - gap);
  });

  const speeds = raw.map((row, i) => {
    const sum = row.reduce((a, b) => a + b, 0);
    const scale = (targets[i] ?? 0) / sum;
    return row.map((v) => v * scale);
  });

  const positions = new Array(n).fill(0);
  const winner = students[winnerIndex] ?? students[0];
  return { speeds, positions, finished: false, winnerName: `${winner.lastName} ${winner.firstName}` };
}

function drawDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  color = "#facc15",
) {
  // Name label
  ctx.fillStyle = "#000";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(name, START_X - 10, y);

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + 18, y, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 3, 7, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(x + 30, y - 2);
  ctx.lineTo(x + 40, y + 2);
  ctx.lineTo(x + 30, y + 6);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + 22, y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(x + 23, y - 4, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 8);
  ctx.lineTo(x + 8, y + 16);
  ctx.moveTo(x + 18, y + 10);
  ctx.lineTo(x + 20, y + 16);
  ctx.stroke();
}

export function DuckRaceCanvas({ students, winnerId }: DuckRaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RaceState | null>(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [finished, setFinished] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);

  const height = Math.max(300, students.length * LANE_HEIGHT + 40);

  const drawFrame = (ctx: CanvasRenderingContext2D, elapsed: number) => {
    const state = stateRef.current;
    if (!state) return;

    ctx.clearRect(0, 0, 1100, height);

    // Track background
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(START_X, 0, TRACK_LENGTH, height);

    // Lane dividers
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= students.length; i++) {
      const y = 30 + i * LANE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(START_X, y);
      ctx.lineTo(FINISH_X, y);
      ctx.stroke();
    }

    // Start / finish lines
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(START_X, 0);
    ctx.lineTo(START_X, height);
    ctx.stroke();

    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(FINISH_X, 0);
    ctx.lineTo(FINISH_X, height);
    ctx.stroke();

    // Ducks
    for (let i = 0; i < students.length; i++) {
      const y = 30 + i * LANE_HEIGHT + LANE_HEIGHT / 2;
      const name = `${students[i]?.lastName ?? ""} ${students[i]?.firstName ?? ""}`;
      drawDuck(ctx, START_X + (state.positions[i] ?? 0), y, name);
    }

    // Timer
    ctx.fillStyle = "#000";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Còn lại: ${Math.max(0, DURATION - elapsed).toFixed(1)}s`, 10, 10);
  };

  useEffect(() => {
    if (!started || finished) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const race = buildRace(students, winnerId);
    stateRef.current = race;

    let raf = 0;
    let startTime = performance.now();
    let lastTime = startTime;

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const second = Math.min(Math.floor(elapsed), DURATION - 1);
      const newPositions = stateRef.current?.positions ?? [];
      const speeds = stateRef.current?.speeds ?? [];

      for (let i = 0; i < students.length; i++) {
        if (elapsed < DURATION) {
          const speed = speeds[i]?.[second] ?? 0;
          newPositions[i] = Math.min(
            (newPositions[i] ?? 0) + speed * dt,
            TRACK_LENGTH,
          );
        }
      }

      if (stateRef.current) {
        stateRef.current.positions = newPositions;
      }

      setTimeLeft(Math.max(0, DURATION - elapsed));
      drawFrame(ctx, elapsed);

      if (elapsed >= DURATION) {
        setFinished(true);
        setWinnerName(race.winnerName);
      } else {
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, students, winnerId]);

  const start = () => {
    setStarted(true);
    setFinished(false);
    setWinnerName(null);
  };

  const reset = () => {
    setStarted(false);
    setFinished(false);
    setWinnerName(null);
    setTimeLeft(DURATION);
    stateRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Đua vịt kiểm tra bài cũ</span>
          <span className="text-sm font-normal text-muted-foreground">
            {timeLeft.toFixed(1)}s
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-auto rounded-lg border border-border">
          <canvas
            ref={canvasRef}
            width={1100}
            height={height}
            className="block bg-background"
          />
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {!started ? (
            <Button onClick={start} size="lg">
              Bắt đầu
            </Button>
          ) : finished ? (
            <Button onClick={reset} variant="secondary">
              Chạy lại
            </Button>
          ) : (
            <Button disabled>Đang chạy...</Button>
          )}

          {finished && winnerName && (
            <p className="text-lg font-semibold text-green-600">
              Người được gọi: {winnerName}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
