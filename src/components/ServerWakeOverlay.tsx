"use client";

import { useEffect, useRef, useState } from "react";
import { Server, Wifi } from "lucide-react";

const INITIAL_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = 5000;
const PROGRESS_DURATION_S = 60;

type Status = "checking" | "awake" | "sleeping";

export function ServerWakeOverlay() {
  const [status, setStatus] = useState<Status>("checking");
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const sleepStartRef = useRef<number>(0);
  const pollingRef = useRef(false);
  const statusRef = useRef<Status>("checking");

  // Keep statusRef in sync so fetch interceptor closure always sees current value
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initial load check
  useEffect(() => {
    checkOnce(INITIAL_TIMEOUT_MS);
  }, []);

  // Global fetch interceptor — catches 503s from any mid-session API call
  useEffect(() => {
    const orig = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await orig(...args);

      if (res.status === 503 && statusRef.current !== "sleeping") {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof URL
              ? args[0].href
              : (args[0] as Request).url;

        if (url.startsWith("/api/") && !url.includes("keep-alive")) {
          handleSleeping();
        }
      }

      return res;
    };

    return () => {
      window.fetch = orig;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkOnce(timeoutMs: number) {
    try {
      const res = await fetch("/api/keep-alive", {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        handleAwake();
        return;
      }
    } catch {}
    handleSleeping();
  }

  function handleAwake() {
    pollingRef.current = false;
    if (visible) {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        setFading(false);
        setStatus("awake");
        statusRef.current = "awake";
      }, 600);
    } else {
      setStatus("awake");
      statusRef.current = "awake";
    }
  }

  function handleSleeping() {
    if (pollingRef.current) return;
    pollingRef.current = true;
    sleepStartRef.current = Date.now();
    setStatus("sleeping");
    statusRef.current = "sleeping";
    setVisible(true);
    setElapsed(0);
    setProgress(0);
    startPolling();
  }

  function startPolling() {
    // Elapsed ticker (every second)
    const elapsedTimer = setInterval(() => {
      if (!pollingRef.current) {
        clearInterval(elapsedTimer);
        return;
      }
      const secs = Math.floor((Date.now() - sleepStartRef.current) / 1000);
      setElapsed(secs);
      setProgress(Math.min(100, (secs / PROGRESS_DURATION_S) * 100));
    }, 1000);

    // Backend poll (every 5s)
    const poll = async () => {
      if (!pollingRef.current) return;
      try {
        const res = await fetch("/api/keep-alive", {
          cache: "no-store",
          signal: AbortSignal.timeout(POLL_INTERVAL_MS - 500),
        });
        if (res.ok) {
          clearInterval(elapsedTimer);
          handleAwake();
          return;
        }
      } catch {}
      if (pollingRef.current) setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INTERVAL_MS);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#090912]/95 backdrop-blur-sm"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 0.6s ease" }}
    >
      <div className="mx-4 w-full max-w-sm">
        <div className="mb-5 flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(99,102,241,0.25)] bg-[linear-gradient(180deg,rgba(99,102,241,0.2)_0%,rgba(99,102,241,0.08)_100%)]">
            <Server className="h-7 w-7 text-[#818cf8]" />
            <span
              className="absolute inset-0 animate-ping rounded-2xl border border-[rgba(99,102,241,0.3)]"
              style={{ animationDuration: "2s" }}
            />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Waking up the server</h2>
          <p className="mt-1.5 text-sm text-white/50">
            Your data is safe. The server went to sleep — waking it up now.
          </p>
        </div>

        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#818cf8_100%)]"
              style={{ width: `${progress}%`, transition: "width 1s linear" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
            <span>{elapsed}s elapsed</span>
            <span>usually 30–60s</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <Wifi className="h-3.5 w-3.5 animate-pulse text-[#818cf8]" />
          <span className="text-[12px] text-white/40">Checking every 5 seconds…</span>
        </div>

        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[11px] text-white/35">
            This screen disappears automatically once connected. No need to refresh or re-enter anything.
          </p>
        </div>
      </div>
    </div>
  );
}
