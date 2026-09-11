"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Cookies from "js-cookie";
import confetti from "canvas-confetti";
import { ArrowLeft, Play, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Student } from "@types";
import { DuckIcon } from "./duck-icon";

interface DuckRaceCanvasProps {
  students: Student[];
  winnerId: string;
  classId: string;
}

const COOKIE_KEY = "race-duration";
const DEFAULT_DURATION = 30;

interface RaceState {
  speeds: number[][];
  positions: number[];
  trackLength: number;
  winnerName: string;
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

type Scenario = 0 | 1 | 2;

function buildRace(students: Student[], winnerId: string, trackLength: number, duration: number): RaceState {
  const n = students.length;
  const winnerIndex = students.findIndex((s) => s.id === winnerId);

  const raw: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let t = 0; t < duration; t++) {
      row.push(randomBetween(25, 85));
    }
    raw.push(row);
  }

  const nonWinnerIndexes = Array.from({ length: n }, (_, i) => i).filter((i) => i !== winnerIndex);
  const scenario: Scenario = Math.floor(Math.random() * 3) as Scenario;

  const pacerCount = Math.min(6, Math.max(0, nonWinnerIndexes.length));
  const pacers = new Set<number>();
  while (pacers.size < pacerCount) {
    const pick = Math.floor(Math.random() * nonWinnerIndexes.length);
    pacers.add(nonWinnerIndexes[pick]);
  }

  const weights: number[][] = raw.map(() => new Array(duration).fill(1));

  for (let i = 0; i < n; i++) {
    if (i === winnerIndex) {
      if (scenario === 0) continue;
      if (scenario === 1) {
        for (let t = 0; t < duration; t++) {
          weights[i][t] = t < duration * 0.55 ? 0.55 : 1.65;
        }
      } else {
        for (let t = 0; t < duration; t++) {
          weights[i][t] = t < duration * 0.75 ? 0.35 : 2.1;
        }
      }
    } else if (pacers.has(i)) {
      for (let t = 0; t < duration; t++) {
        weights[i][t] = t < duration * 0.65 ? 0.45 : 1.85;
      }
    } else if (scenario === 2) {
      for (let t = 0; t < duration; t++) {
        weights[i][t] = 0.85;
      }
    }
  }

  const targets = students.map((_, i) => {
    if (i === winnerIndex) return trackLength;
    if (pacers.has(i)) {
      const gap = randomBetween(80, Math.min(220, trackLength * 0.15));
      return Math.max(0, trackLength - gap);
    }
    const gap = randomBetween(250, Math.min(900, trackLength * 0.35));
    return Math.max(0, trackLength - gap);
  });

  const speeds = raw.map((row, i) => {
    const shaped = row.map((v, t) => v * weights[i][t]);
    const shapedSum = shaped.reduce((a, b) => a + b, 0);
    const target = targets[i] ?? 0;
    const scale = target / (shapedSum || 1);
    return shaped.map((v) => v * scale);
  });

  const positions = new Array(n).fill(0);
  const winner = students[winnerIndex] ?? students[0];
  return {
    speeds,
    positions,
    trackLength,
    winnerName: `${winner.lastName} ${winner.firstName}`,
  };
}

function renderDuckToImage(color: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);
    const root = createRoot(container);

    setTimeout(() => {
      flushSync(() => {
        root.render(<DuckIcon color={color} size={128} />);
      });
      const svg = container.querySelector("svg");
      if (!svg) {
        root.unmount();
        container.remove();
        reject(new Error("DuckIcon SVG not found"));
        return;
      }
      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        root.unmount();
        container.remove();
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        root.unmount();
        container.remove();
        reject(new Error("DuckIcon image load failed"));
      };
      img.src = url;
    }, 0);
  });
}

function drawDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  scale: number,
  image: HTMLImageElement,
) {
  const duckFont = Math.min(Math.max(scale * 11, 9), 12);
  const w = 36 * scale;
  let h = 32 * scale;
  let cx = x + w / 2;

  if (image.complete && image.naturalWidth > 0) {
    h = (image.height / image.width) * w;
    const top = y - h / 2;
    ctx.drawImage(image, x, top, w, h);
    cx = x + w / 2;
  }

  ctx.font = `${duckFont}px sans-serif`;
  const metrics = ctx.measureText(name);
  const textW = metrics.width;
  const nameY = y - h / 2 - 4;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(cx - textW / 2 - 3, nameY - duckFont - 3, textW + 6, duckFont + 6);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(name, cx, nameY);
}

export function DuckRaceCanvas({ students, winnerId, classId }: DuckRaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<RaceState | null>(null);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [finished, setFinished] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [duckImages, setDuckImages] = useState<Record<string, HTMLImageElement>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const duckImagesReady = Object.keys(duckImages).length > 0;
  const [draftDuration, setDraftDuration] = useState(DEFAULT_DURATION);
  const confettiFired = useRef(false);

  useEffect(() => {
    const saved = Cookies.get(COOKIE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 120) {
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
        confetti({ ...defaults, particleCount: 60, spread: 120, startVelocity: 45 });
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
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
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
    const duckScale = Math.min(laneHeight * 0.55 / 56, 1.2);
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
      ctx.fillRect(worldStart - cameraX, roadTop, state.trackLength, roadBottom - roadTop);

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
        .map((s, i) => ({ ...s, i, pos: state.positions[i] ?? 0, lane: i % laneCount }))
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
      ctx.fillText(`Còn lại: ${Math.max(0, duration - elapsed).toFixed(1)}s`, 10, 10);
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
  }, [started, finished, size, students, winnerId]);

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
    setTimeLeft(duration);
    stateRef.current = null;
  };

  const reset = () => {
    close();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="grid h-14 grid-cols-3 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/classes/${classId}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft /> Quay lại
          </Link>
          <h1 className="text-base font-semibold sm:text-lg">Kiểm tra bài cũ</h1>
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
          <span className="text-sm font-medium tabular-nums">{timeLeft.toFixed(1)}s</span>
        </div>
      </header>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật thời gian đua</DialogTitle>
            <DialogDescription>Nhập thời gian đua từ 5 đến 120 giây.</DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Thời gian đua"
            type="number"
            min={5}
            max={120}
            value={draftDuration}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              setDraftDuration(isNaN(parsed) ? DEFAULT_DURATION : parsed);
            }}
            className="h-10 text-base"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (draftDuration >= 5 && draftDuration <= 120) {
                  setDuration(draftDuration);
                  setTimeLeft(draftDuration);
                  Cookies.set(COOKIE_KEY, String(draftDuration), { expires: 365 });
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
              <Play className="size-6" /> {duckImagesReady ? "Bắt đầu" : "Đang tải..."}
            </Button>
          </div>
        )}
      </div>

      {finished && winnerName && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 p-6 text-center backdrop-blur-sm">
          <button
            onClick={close}
            aria-label="Đóng"
            className="absolute top-4 right-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" />
          </button>
          <div className="animate-bounce rounded-3xl bg-gradient-to-br from-green-500 to-green-700 p-10 shadow-2xl">
            <p className="text-4xl font-bold text-white sm:text-6xl">Xin chúc mừng</p>
            <p className="mt-6 break-words text-5xl font-extrabold text-white sm:text-8xl">{winnerName}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={close} variant="secondary" size="lg" className="gap-2 text-lg">
              Đóng
            </Button>
            <Button onClick={reset} size="lg" className="gap-2 text-lg">
              <RotateCcw className="size-5" /> Chạy lại
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
