"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  RACE_DURATION_COOKIE,
  DEFAULT_RACE_DURATION,
  MIN_RACE_DURATION,
  MAX_RACE_DURATION,
} from "@constants";

interface RaceDurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duration: number;
  onSave: (duration: number) => void;
}

export function RaceDurationDialog({
  open,
  onOpenChange,
  duration,
  onSave,
}: RaceDurationDialogProps) {
  const [draftDuration, setDraftDuration] = useState(duration);
  const [prevOpen, setPrevOpen] = useState(open);

  // Re-seed the draft from the saved duration each time the dialog opens.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setDraftDuration(duration);
  }

  function onConfirm() {
    if (
      draftDuration >= MIN_RACE_DURATION &&
      draftDuration <= MAX_RACE_DURATION
    ) {
      Cookies.set(RACE_DURATION_COOKIE, String(draftDuration), {
        expires: 365,
      });
      onSave(draftDuration);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            setDraftDuration(isNaN(parsed) ? DEFAULT_RACE_DURATION : parsed);
          }}
          className="h-10 text-base"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onConfirm}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
