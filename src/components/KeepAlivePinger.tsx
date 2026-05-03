"use client";

import { useEffect } from "react";

const MIN_INTERVAL_MS = 12 * 60 * 1000;
const MAX_INTERVAL_MS = 15 * 60 * 1000;
const ACTIVE_START_HOUR = 6;
const ACTIVE_END_HOUR = 24;

function isActiveHour(): boolean {
  const hour = new Date().getHours();
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR;
}

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

export function KeepAlivePinger() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const ping = async () => {
      if (isActiveHour()) {
        try {
          await fetch("/api/keep-alive", { cache: "no-store" });
        } catch {}
      }
      timeoutId = setTimeout(ping, randomInterval());
    };

    timeoutId = setTimeout(ping, randomInterval());
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
