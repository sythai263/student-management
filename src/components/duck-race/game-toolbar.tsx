"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "../ui/button";
import { GameModeSwitch } from "./game-mode-switch";
import { RaceDurationDialog } from "./race-duration-dialog";
import { getRaceDuration } from "@lib/duck-race";

/** Header toolbar for the (games) layout — mode switch + duration settings.
 *  Duration persists via cookie; each game reads it when a round starts. */
export function GameToolbar({ classId }: { classId: string }) {
  const [durationOpen, setDurationOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <GameModeSwitch classId={classId} />
      <Button
        variant="outline"
        size="icon"
        onClick={() => setDurationOpen(true)}
        aria-label="Cập nhật thời gian"
        title="Cập nhật thời gian"
      >
        <Timer />
      </Button>
      <RaceDurationDialog
        open={durationOpen}
        onOpenChange={setDurationOpen}
        duration={getRaceDuration()}
        onSave={() => {}}
      />
    </div>
  );
}
