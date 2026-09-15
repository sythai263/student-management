"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import SignaturePadLib from "signature_pad";
import { PenLine, RotateCcw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { exportSignaturePng } from "@lib/image";
import { friendlyErrorMessage } from "@lib/utils";

export interface SignaturePadHandle {
  clear: () => void;
}

interface SignaturePadProps {
  onSave: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  ref?: Ref<SignaturePadHandle>;
}

const PAD_HEIGHT = 260;
const INK_COLOR = "#1f2937";

/**
 * Canvas board for drawing the teacher's signature directly in the
 * browser, backed by `signature_pad` — strokes are smoothed with cubic
 * Bézier interpolation and vary in width with pointer velocity, like
 * real ink. The exported PNG keeps a transparent background for
 * printing on report cards.
 */
export function SignaturePad({
  onSave,
  onError,
  disabled,
  ref,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Size the backing store for the device pixel ratio so strokes stay
  // crisp — the dialog renders at a fixed width, so no resize handling
  // is needed. Re-running the effect (StrictMode) resets cleanly via off().
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = PAD_HEIGHT * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);

    const pad = new SignaturePadLib(canvas, {
      penColor: INK_COLOR,
      minWidth: 0.8,
      maxWidth: 3,
    });
    const onEndStroke = () => setIsEmpty(pad.isEmpty());
    pad.addEventListener("endStroke", onEndStroke);
    padRef.current = pad;

    return () => {
      pad.removeEventListener("endStroke", onEndStroke);
      pad.off();
      padRef.current = null;
    };
  }, []);

  // Block input while a save is in flight.
  useEffect(() => {
    if (disabled) {
      padRef.current?.off();
    } else {
      padRef.current?.on();
    }
  }, [disabled]);

  const clear = useCallback(() => {
    padRef.current?.clear();
    setIsEmpty(true);
  }, []);

  useImperativeHandle(ref, () => ({ clear }), [clear]);

  async function onSaveClick() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    try {
      onSave(await exportSignaturePng(canvas));
    } catch (err) {
      onError?.(friendlyErrorMessage(err));
    }
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          className={cn(
            "block w-full touch-none",
            disabled ? "opacity-50" : "cursor-crosshair",
          )}
          style={{ height: PAD_HEIGHT }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Dùng chuột hoặc ngón tay để ký
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isEmpty}
            onClick={clear}
          >
            <RotateCcw /> Ký lại
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled || isEmpty}
            onClick={onSaveClick}
          >
            <PenLine /> Lưu chữ ký
          </Button>
        </div>
      </div>
    </div>
  );
}
