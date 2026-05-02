"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type PlatformStats = { owners: number; hostels: number; tenants: number };

async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await fetch("/api/platform-stats");
  if (!res.ok) return { owners: 0, hostels: 0, tenants: 0 };
  return res.json() as Promise<PlatformStats>;
}

export function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
    staleTime: 5 * 60 * 1000, // 5 min — platform totals don't need real-time updates
    placeholderData: { owners: 0, hostels: 0, tenants: 0 },
  });
}

/**
 * Animates a number from 0 → target over `duration` ms.
 * Snaps immediately when target changes (e.g. data loads).
 */
export function useCountUp(target: number, duration = 1200): number {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }

    from.current = display;
    start.current = null;

    const step = (timestamp: number) => {
      if (start.current === null) start.current = timestamp;
      const elapsed = timestamp - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from.current + (target - from.current) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}
