"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Play } from "lucide-react";
import { Button } from "../ui/button";
import type { Student } from "@types";
import { studentFullName } from "@lib/string";
import { getRaceDuration, randomBetween } from "@lib/duck-race";
import { drawDuck } from "./draw-duck";
import { renderDuckToImage } from "./render-duck-image";
import { RaceGradeModal } from "./race-grade-modal";
import { WinnerDialog } from "./winner-dialog";

/** Seconds before the end when the catcher locks onto the winner. */
const LOCK_ON_SECONDS = 2;
const CATCHER_RADIUS = 30;

interface DuckBody {
  x: number;
  y: number;
  heading: number;
  speed: number;
  nextVeerAt: number;
}

interface CatcherBody {
  x: number;
  y: number;
  speed: number;
  target: number;
  nextRetargetAt: number;
}

interface CatchSim {
  ducks: DuckBody[];
  catcher: CatcherBody;
  caughtIndex: number;
}

interface DuckCatchCanvasProps {
  students: Student[];
  winnerId: string;
  classId: string;
  subjectId?: string;
}

/** Catch-the-duck: ducks wander inside a circular pen while a "quản trò"
 *  net chases random targets — locking onto the winner at the end. */
export function DuckCatchCanvas({
  students,
  winnerId,
  classId,
  subjectId,
}: DuckCatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<CatchSim | null>(null);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [duckImages, setDuckImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const [gradeOpen, setGradeOpen] = useState(false);
  const confettiFired = useRef(false);
  const duckImagesReady = Object.keys(duckImages).length > 0;

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
    const duration = getRaceDuration();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width / 2;
    const cy = height / 2;
    const penR = Math.max(120, Math.min(width, height) / 2 - 56);
    const duckR = 20;
    const duckScale = Math.min(
      1.1,
      Math.max(0.45, (penR * 2) / (Math.sqrt(students.length) * 160)),
    );
    const colors = students.map((_, i) => `hsl(${(i * 137) % 360}, 75%, 55%)`);
    const winnerIndex = Math.max(
      0,
      students.findIndex((s) => s.id === winnerId),
    );

    // Scatter the ducks inside the pen with random headings/speeds.
    const ducks: DuckBody[] = students.map(() => {
      const a = randomBetween(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * (penR - duckR - 16);
      return {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        heading: randomBetween(0, Math.PI * 2),
        speed: randomBetween(50, 140),
        nextVeerAt: randomBetween(0.5, 2),
      };
    });

    const nonWinner = students.map((_, i) => i).filter((i) => i !== winnerIndex);
    const randomTarget = () =>
      nonWinner.length
        ? nonWinner[Math.floor(Math.random() * nonWinner.length)]
        : winnerIndex;

    const sim: CatchSim = {
      ducks,
      catcher: {
        x: cx,
        y: cy,
        speed: randomBetween(150, 190),
        target: randomTarget(),
        nextRetargetAt: randomBetween(1, 2.5),
      },
      caughtIndex: -1,
    };
    simRef.current = sim;

    const drawNet = (x: number, y: number) => {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, CATCHER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      // Net mesh
      ctx.strokeStyle = "rgba(250,204,21,0.45)";
      ctx.lineWidth = 1;
      for (const off of [-14, 0, 14]) {
        ctx.beginPath();
        ctx.moveTo(x - CATCHER_RADIUS, y + off);
        ctx.lineTo(x + CATCHER_RADIUS, y + off);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + off, y - CATCHER_RADIUS);
        ctx.lineTo(x + off, y + CATCHER_RADIUS);
        ctx.stroke();
      }
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("QUẢN TRÒ", x, y - CATCHER_RADIUS - 8);
    };

    const drawFrame = (elapsed: number) => {
      const state = simRef.current;
      if (!state) return;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // The circular pen — ducks can never leave it.
      ctx.fillStyle = "rgba(250,204,21,0.04)";
      ctx.beginPath();
      ctx.arc(cx, cy, penR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw ducks bottom-up so lower ones overlap upper ones.
      const sorted = state.ducks
        .map((d, i) => ({ ...d, i }))
        .sort((a, b) => a.y - b.y);

      for (const d of sorted) {
        const isCaught =
          state.caughtIndex === d.i && state.caughtIndex !== -1;
        const wobble = Math.sin(elapsed * 9 + d.i * 2.1);
        const image = duckImages[colors[d.i]];
        if (!image) continue;
        if (isCaught) {
          // Glow behind the caught duck.
          ctx.fillStyle = "rgba(250,204,21,0.25)";
          ctx.beginPath();
          ctx.arc(d.x, d.y, 34 * duckScale, 0, Math.PI * 2);
          ctx.fill();
        }
        drawDuck(
          ctx,
          d.x - 18 * duckScale,
          d.y + wobble * 3,
          studentFullName(students[d.i]),
          isCaught ? duckScale * 1.2 : duckScale,
          image,
          wobble * 0.1,
        );
      }

      drawNet(state.catcher.x, state.catcher.y);
    };

    let raf = 0;
    const startTime = performance.now();
    let lastTime = startTime;

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const state = simRef.current;
      if (!state) return;

      // Ducks wander with random heading/speed changes — unpredictable.
      for (const d of state.ducks) {
        if (elapsed >= d.nextVeerAt) {
          d.heading += randomBetween(-1.5, 1.5);
          d.speed = Math.min(
            170,
            Math.max(45, d.speed * randomBetween(0.7, 1.4)),
          );
          d.nextVeerAt = elapsed + randomBetween(0.4, 1.8);
        }
        d.heading += randomBetween(-1, 1) * dt * 2.5;
        d.x += Math.cos(d.heading) * d.speed * dt;
        d.y += Math.sin(d.heading) * d.speed * dt;

        // Bounce off the pen wall — reflect velocity across the normal.
        const dx = d.x - cx;
        const dy = d.y - cy;
        const dist = Math.hypot(dx, dy);
        const maxDist = penR - duckR;
        if (dist > maxDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const vx = Math.cos(d.heading);
          const vy = Math.sin(d.heading);
          const dot = vx * nx + vy * ny;
          d.heading = Math.atan2(vy - 2 * dot * ny, vx - 2 * dot * nx);
          d.x = cx + nx * maxDist;
          d.y = cy + ny * maxDist;
        }
      }

      const catcher = state.catcher;
      const lockOn = elapsed >= duration - LOCK_ON_SECONDS;

      // Random re-targeting keeps the catch unpredictable until the end.
      if (!lockOn && elapsed >= catcher.nextRetargetAt) {
        catcher.target = randomTarget();
        catcher.speed = randomBetween(140, 200);
        catcher.nextRetargetAt = elapsed + randomBetween(1, 2.4);
      }

      const target = state.ducks[lockOn ? winnerIndex : catcher.target];
      if (target) {
        const dx = target.x - catcher.x;
        const dy = target.y - catcher.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          // In lock-on phase, scale speed so contact lands on time.
          const speed = lockOn
            ? Math.max(
              catcher.speed,
              (dist / Math.max(duration - elapsed, 0.05)) * 1.05,
            )
            : catcher.speed;
          const step = Math.min(speed * dt, dist);
          catcher.x += (dx / dist) * step;
          catcher.y += (dy / dist) * step;
        }
      }

      const winnerDuck = state.ducks[winnerIndex];
      const catchDist = winnerDuck
        ? Math.hypot(catcher.x - winnerDuck.x, catcher.y - winnerDuck.y)
        : Infinity;
      const caught =
        (lockOn && catchDist <= CATCHER_RADIUS + duckR) ||
        elapsed >= duration;

      if (caught && winnerDuck) {
        state.caughtIndex = winnerIndex;
        // Snap the caught duck into the net.
        winnerDuck.x = catcher.x;
        winnerDuck.y = catcher.y;
      }

      drawFrame(elapsed);

      if (caught) {
        setFinished(true);
        setWinnerName(
          studentFullName(students[winnerIndex] ?? students[0]),
        );
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
    setGradeOpen(false);
    simRef.current = null;
  };

  return (
    <>
      <div ref={containerRef} className="relative h-full">
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

      <WinnerDialog
        open={finished && !!winnerName && !gradeOpen}
        winnerName={winnerName ?? ""}
        onClose={close}
        onEnterGrade={() => setGradeOpen(true)}
      />

      <RaceGradeModal
        open={gradeOpen}
        onOpenChange={setGradeOpen}
        classId={classId}
        subjectId={subjectId}
        studentId={winnerId}
        studentName={winnerName ?? undefined}
      />
    </>
  );
}
