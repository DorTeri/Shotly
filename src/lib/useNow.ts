"use client";

import { useEffect, useState } from "react";

/** A ticking clock for develop countdowns and Ceremony Mode. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function countdown(toMs: number, fromMs: number): string {
  const s = Math.max(0, Math.round((toMs - fromMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  // Develop timers are always minutes, but a timed challenge can be hours out,
  // and "74:47" reads like a broken clock.
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
