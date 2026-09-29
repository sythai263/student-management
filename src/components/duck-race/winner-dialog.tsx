"use client";

import { Pencil, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";

interface WinnerDialogProps {
  open: boolean;
  winnerName: string;
  onClose: () => void;
  /** Switch to the grade-entry modal instead of closing the race. */
  onEnterGrade: () => void;
}

/** Fullscreen celebration shown when the race finishes. */
export function WinnerDialog({
  open,
  winnerName,
  onClose,
  onEnterGrade,
}: WinnerDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="inset-0 flex h-full max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-6 rounded-none bg-black/70 p-6 text-center text-white ring-0 backdrop-blur-sm sm:max-w-none"
      >
        <DialogTitle className="sr-only">Học sinh thắng cuộc</DialogTitle>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute top-4 right-4 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            />
          }
          aria-label="Đóng"
        >
          <X className="size-6" />
        </DialogClose>
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
            onClick={onClose}
            variant="secondary"
            size="lg"
            className="gap-2 text-lg"
          >
            Đóng
          </Button>
          <Button onClick={onEnterGrade} size="lg" className="gap-2 text-lg">
            <Pencil className="size-5" /> Nhập điểm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
