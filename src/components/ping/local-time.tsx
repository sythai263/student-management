"use client";

import dayjs from "dayjs";
import { useSyncExternalStore } from "react";

interface LocalTimeProps {
  iso: string;
  className?: string;
}

// Mounted-check via useSyncExternalStore: server render and hydration
// both produce "" (getServerSnapshot), then the client re-renders with
// the visitor's own timezone — no hydration mismatch.
const subscribe = () => () => {};

/**
 * Formats an ISO timestamp in the visitor's own timezone. Server-side
 * formatting would use the server's TZ, so the text only appears after
 * mount.
 */
export function LocalTime({ iso, className }: LocalTimeProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <time dateTime={iso} className={className}>
      {mounted ? dayjs(iso).format("HH:mm:ss · DD/MM/YYYY") : ""}
    </time>
  );
}
