"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Play } from "lucide-react";
import { Button } from "../ui/button";
import type { RaceState, Student } from "@types";
import { studentFullName } from "@lib/string";
import { buildRace, duckPlayerColor, getRaceDuration } from "@lib/duck-race";
import { DUCK_COLORS } from "@constants";
import { DuckIcon } from "./duck-icon";
import { drawDuck } from "./draw-duck";
import { renderDuckToImage } from "./render-duck-image";
import { RaceGradeModal } from "./race-grade-modal";
import { WinnerDialog } from "./winner-dialog";

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
    const colors = students.map((_, i) => duckPlayerColor(i));
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
    // Scale the backing store by devicePixelRatio so the race stays sharp
    // on high-DPI phones (e.g. DPR 2-3 on 2K panels); drawing code below
    // keeps using CSS-pixel coordinates via setTransform.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const worldStart = 40;
    const trackLength = Math.max(1800, width * 2.2);
    const laneCount = Math.min(8, Math.max(1, students.length));
    const roadTop = 60;
    const roadBottom = height - 60;
    const laneHeight = (roadBottom - roadTop) / laneCount;
    const duckScale = Math.min((laneHeight * 0.55) / 56, 1.2);
    const colors = students.map((_, i) => duckPlayerColor(i));

    const race = buildRace(students, winnerId, trackLength, duration);
    stateRef.current = race;

    let raf = 0;
    const startTime = performance.now();
    let lastTime = startTime;

    const drawFrame = (elapsed: number) => {
      const state = stateRef.current;
      if (!state) return;

      const maxPos = Math.max(...state.positions);
      const progress = Math.min(maxPos / state.trackLength, 1);
      const pan = 0.2 * width + progress * 0.65 * width;
      let cameraX = worldStart + maxPos - pan;
      if (cameraX < 0) cameraX = 0;

      // Black race background — the whole race screen runs on black.
      ctx.fillStyle = DUCK_COLORS.stage;
      ctx.fillRect(0, 0, width, height);

      // Lane dividers
      ctx.strokeStyle = DUCK_COLORS.laneDivider;
      ctx.lineWidth = 1;
      for (let lane = 0; lane <= laneCount; lane++) {
        const y = roadTop + lane * laneHeight;
        ctx.beginPath();
        ctx.moveTo(worldStart - cameraX, y);
        ctx.lineTo(worldStart + state.trackLength - cameraX, y);
        ctx.stroke();
      }

      // Distance markers on the track — dashed ticks every 10m of a 100m race.
      ctx.strokeStyle = DUCK_COLORS.markerTick;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = DUCK_COLORS.markerText;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let m = 10; m < 100; m += 10) {
        const mx = worldStart + (m / 100) * state.trackLength - cameraX;
        if (mx < -20 || mx > width + 20) continue;
        ctx.beginPath();
        ctx.moveTo(mx, roadTop);
        ctx.lineTo(mx, roadBottom);
        ctx.stroke();
        ctx.fillText(`${m}m`, mx, roadBottom + 8);
      }
      ctx.setLineDash([]);

      // Start line
      ctx.strokeStyle = DUCK_COLORS.startLine;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(worldStart - cameraX, roadTop);
      ctx.lineTo(worldStart - cameraX, roadBottom);
      ctx.stroke();
      ctx.fillStyle = DUCK_COLORS.startLine;
      ctx.textAlign = "center";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("XUẤT PHÁT", worldStart - cameraX, roadTop - 10);

      // Finish line
      const finishX = worldStart + state.trackLength;
      ctx.strokeStyle = DUCK_COLORS.finishLine;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(finishX - cameraX, roadTop);
      ctx.lineTo(finishX - cameraX, roadBottom);
      ctx.stroke();
      ctx.fillStyle = DUCK_COLORS.finishLine;
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
        const baseY = roadTop + d.lane * laneHeight + laneHeight / 2;
        // Running motion: per-duck phased bob (vertical) + body tilt.
        const wobble = Math.sin(elapsed * 11 + d.i * 2.4);
        const y = baseY + wobble * laneHeight * 0.06;
        const tilt = wobble * 0.12;
        const name = studentFullName(d);
        const image = duckImages[colors[d.i]];
        if (image) {
          drawDuck(ctx, x, y, name, duckScale, image, tilt);
        }
      }

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
    setGradeOpen(false);
    stateRef.current = null;
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
