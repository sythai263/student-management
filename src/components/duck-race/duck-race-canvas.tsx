"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import confetti from "canvas-confetti";
import { ArrowLeft, Pencil, Play, X } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RaceState, Student } from "@types";
import {
  RACE_DURATION_COOKIE,
  DEFAULT_RACE_DURATION,
  MIN_RACE_DURATION,
  MAX_RACE_DURATION,
} from "@constants";
import { buildRace } from "@lib/duck-race";
import { DuckIcon } from "./duck-icon";
import { drawDuck } from "./draw-duck";
import { renderDuckToImage } from "./render-duck-image";
import { RaceGradeModal } from "./race-grade-modal";

interface DuckRaceCanvasProps {
  students: Student[];
  winnerId: string;
  classId: string;
  subjectId?: string;
}

export function DuckRaceCanvas({
  students,
  winnerId,
  classId,
  subjectId,
}: DuckRaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<RaceState | null>(null);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState<number>(DEFAULT_RACE_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_RACE_DURATION);
  const [finished, setFinished] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [duckImages, setDuckImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [modalOpen, setModalOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [draftDuration, setDraftDuration] = useState(DEFAULT_RACE_DURATION);
  const confettiFired = useRef(false);
  const duckImagesReady = Object.keys(duckImages).length > 0;

  useEffect(() => {
    const saved = Cookies.get(RACE_DURATION_COOKIE);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (
        !isNaN(parsed) &&
        parsed >= MIN_RACE_DURATION &&
        parsed <= MAX_RACE_DURATION
      ) {
        setDuration(parsed);
        setTimeLeft(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (finished && winnerName && !confettiFired.current) {
      confettiFired.current = true;
      const defaults = { origin: { y: 0.7 } };
      const end = Date.now() + 2000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }
        confetti({
          ...defaults,
          particleCount: 60,
          spread: 120,
          startVelocity: 45,
        });
      }, 200);
    }
  }, [finished, winnerName]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const colors = students.map((_, i) => `hsl(${(i * 137) % 360}, 75%, 55%)`);
    const unique = Array.from(new Set(colors));
    const map: Record<string, HTMLImageElement> = {};

    const load = async () => {
      for (const color of unique) {
        map[color] = await renderDuckToImage(color);
      }
      setDuckImages(map);
    };
    load();
  }, [students]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("resize", resize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!started || finished || !size) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = size;
    canvas.width = width;
    canvas.height = height;

    const worldStart = 40;
    const trackLength = Math.max(1800, width * 2.2);
    const laneCount = Math.min(8, Math.max(1, students.length));
    const roadTop = 60;
    const roadBottom = height - 60;
    const laneHeight = (roadBottom - roadTop) / laneCount;
    const duckScale = Math.min((laneHeight * 0.55) / 56, 1.2);
    const colors = students.map((_, i) => `hsl(${(i * 137) % 360}, 75%, 55%)`);

    const race = buildRace(students, winnerId, trackLength, duration);
    stateRef.current = race;

    let raf = 0;
    let startTime = performance.now();
    let lastTime = startTime;

    const drawFrame = (elapsed: number) => {
      const state = stateRef.current;
      if (!state) return;

      const maxPos = Math.max(...state.positions);
      const progress = Math.min(maxPos / state.trackLength, 1);
      const pan = 0.2 * width + progress * 0.65 * width;
      let cameraX = worldStart + maxPos - pan;
      if (cameraX < 0) cameraX = 0;

      ctx.clearRect(0, 0, width, height);

      // Track road
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(
        worldStart - cameraX,
        roadTop,
        state.trackLength,
        roadBottom - roadTop,
      );

      // Lane dividers
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      for (let lane = 0; lane <= laneCount; lane++) {
        const y = roadTop + lane * laneHeight;
        ctx.beginPath();
        ctx.moveTo(worldStart - cameraX, y);
        ctx.lineTo(worldStart + state.trackLength - cameraX, y);
        ctx.stroke();
      }

      // Start line
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(worldStart - cameraX, roadTop);
      ctx.lineTo(worldStart - cameraX, roadBottom);
      ctx.stroke();
      ctx.fillStyle = "#22c55e";
      ctx.textAlign = "center";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("XUẤT PHÁT", worldStart - cameraX, roadTop - 10);

      // Finish line
      const finishX = worldStart + state.trackLength;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(finishX - cameraX, roadTop);
      ctx.lineTo(finishX - cameraX, roadBottom);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.fillText("VỀ ĐÍCH", finishX - cameraX, roadTop - 10);

      // Draw ducks sorted by x so front ones overlap back ones
      const sorted = students
        .map((s, i) => ({
          ...s,
          i,
          pos: state.positions[i] ?? 0,
          lane: i % laneCount,
        }))
        .sort((a, b) => a.pos - b.pos);

      for (const d of sorted) {
        const x = worldStart + d.pos - cameraX;
        const y = roadTop + d.lane * laneHeight + laneHeight / 2;
        const name = `${d.lastName} ${d.firstName}`;
        const image = duckImages[colors[d.i]];
        if (image) {
          drawDuck(ctx, x, y, name, duckScale, image);
        }
      }

      // Timer
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(
        `Còn lại: ${Math.max(0, duration - elapsed).toFixed(1)}s`,
        10,
        10,
      );
    };

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const second = Math.min(Math.floor(elapsed), duration - 1);
      const state = stateRef.current;

      if (state && elapsed < duration) {
        for (let i = 0; i < students.length; i++) {
          const speed = state.speeds[i]?.[second] ?? 0;
          state.positions[i] = Math.min(
            (state.positions[i] ?? 0) + speed * dt,
            state.trackLength,
          );
        }
      }

      setTimeLeft(Math.max(0, duration - elapsed));
      drawFrame(elapsed);

      if (elapsed >= duration) {
        setFinished(true);
        setWinnerName(race.winnerName);
      } else {
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [started, finished, size, students, winnerId, duration]);

  const start = () => {
    setStarted(true);
    setFinished(false);
    setWinnerName(null);
  };

  const close = () => {
    confettiFired.current = false;
    setStarted(false);
    setFinished(false);
    setWinnerName(null);
    setGradeOpen(false);
    setTimeLeft(duration);
    stateRef.current = null;
  };

  const backHref = subjectId
    ? `/classes/${classId}?subjectId=${subjectId}`
    : `/classes/${classId}`;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="grid h-14 grid-cols-3 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft /> Quay lại
          </Link>
          <h1 className="text-base font-semibold sm:text-lg">
            Kiểm tra bài cũ
          </h1>
        </div>
        <div className="flex items-center justify-center" />
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraftDuration(duration);
              setModalOpen(true);
            }}
            disabled={started}
          >
            Cập nhật thời gian đua
          </Button>
          <span className="text-sm font-medium tabular-nums">
            {timeLeft.toFixed(1)}s
          </span>
        </div>
      </header>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật thời gian đua</DialogTitle>
            <DialogDescription>
              Nhập thời gian đua từ 5 đến 120 giây.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Thời gian đua"
            type="number"
            min={MIN_RACE_DURATION}
            max={MAX_RACE_DURATION}
            value={draftDuration}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              setDraftDuration(
                isNaN(parsed) ? DEFAULT_RACE_DURATION : parsed,
              );
            }}
            className="h-10 text-base"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (
                  draftDuration >= MIN_RACE_DURATION &&
                  draftDuration <= MAX_RACE_DURATION
                ) {
                  setDuration(draftDuration);
                  setTimeLeft(draftDuration);
                  Cookies.set(RACE_DURATION_COOKIE, String(draftDuration), {
                    expires: 365,
                  });
                  setModalOpen(false);
                }
              }}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div ref={containerRef} className="relative flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />
        {!started && !finished && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
            <Button
              onClick={start}
              size="lg"
              disabled={!duckImagesReady}
              className="gap-2 px-10 py-6 text-xl"
            >
              <Play className="size-6" />{" "}
              {duckImagesReady ? "Bắt đầu" : "Đang tải..."}
            </Button>
          </div>
        )}
      </div>

      {finished && winnerName && !gradeOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 p-6 text-center backdrop-blur-sm">
          <button
            onClick={close}
            aria-label="Đóng"
            className="absolute top-4 right-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" />
          </button>
          <div className="animate-bounce rounded-3xl bg-gradient-to-br from-green-500 to-green-700 p-10 shadow-2xl">
            <p className="text-4xl font-bold text-white sm:text-6xl">
              Xin chúc mừng
            </p>
            <p className="mt-6 break-words text-5xl font-extrabold text-white sm:text-8xl">
              {winnerName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={close}
              variant="secondary"
              size="lg"
              className="gap-2 text-lg"
            >
              Đóng
            </Button>
            <Button
              onClick={() => setGradeOpen(true)}
              size="lg"
              className="gap-2 text-lg"
            >
              <Pencil className="size-5" /> Nhập điểm
            </Button>
          </div>
        </div>
      )}

      <RaceGradeModal
        open={gradeOpen}
        onOpenChange={setGradeOpen}
        classId={classId}
        subjectId={subjectId}
        studentId={winnerId}
        studentName={winnerName ?? undefined}
      />
    </div>
  );
}
