"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 5000;

type Phase = "checking" | "sleeping" | "ready";

export function ServerWakeOverlay() {
  const [phase, setPhase]     = useState<Phase>("checking");
  const [visible, setVisible] = useState(false);
  const [fading, setFading]   = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const phaseRef    = useRef<Phase>("checking");
  const pollingRef  = useRef(false);
  const sleepStart  = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase !== "sleeping") return;
    sleepStart.current = Date.now();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sleepStart.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  function triggerSleeping() {
    if (pollingRef.current) return;
    pollingRef.current = true;
    sleepStart.current = 0;
    setPhase("sleeping");
    phaseRef.current = "sleeping";
    setVisible(true);
    setElapsed(0);

    const poll = async () => {
      if (!pollingRef.current) return;
      try {
        const res = await fetch("/api/keep-alive", {
          cache: "no-store",
          signal: AbortSignal.timeout(POLL_INTERVAL_MS - 500),
        });
        if (res.ok) {
          pollingRef.current = false;
          setPhase("ready");
          phaseRef.current = "ready";
          setTimeout(() => {
            setFading(true);
            setTimeout(() => setVisible(false), 700);
          }, 1400);
          return;
        }
      } catch {}
      if (pollingRef.current) setTimeout(poll, POLL_INTERVAL_MS);
    };
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocal || process.env.NEXT_PUBLIC_DISABLE_WAKE_OVERLAY === "1") return;

    fetch("/api/keep-alive", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
      .then((r) => { if (!r.ok) triggerSleeping(); })
      .catch(() => triggerSleeping());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await orig(...args);
      if (res.status === 503 && phaseRef.current !== "sleeping") {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof URL
              ? args[0].href
              : (args[0] as Request).url;
        if (url.startsWith("/api/") && !url.includes("keep-alive")) {
          triggerSleeping();
        }
      }
      return res;
    };
    return () => { window.fetch = orig; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const isReady = phase === "ready";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s ease",
        background: "rgba(5,5,14,0.96)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center">

        {/* Spinner / ready check */}
        {isReady ? (
          <div className="flex h-[160px] w-[160px] items-center justify-center">
            <span className="text-6xl">✅</span>
          </div>
        ) : (
          <NeonSpinner />
        )}

        {/* Status */}
        <div>
          <p className="text-[13px] font-semibold text-white/65">
            {isReady
              ? "Ready — loading your data"
              : `Starting up${elapsed > 0 ? ` · ${elapsed}s` : "…"}`}
          </p>
          {!isReady && (
            <p className="mt-0.5 text-[11px] text-white/25">
              Usually 30–90 seconds · screen disappears automatically
            </p>
          )}
        </div>

        {/* Progress bar */}
        {!isReady && (
          <div className="w-44">
            <div className="h-0.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#a78bfa)]"
                style={{
                  width: `${Math.min(98, (elapsed / 90) * 100)}%`,
                  transition: "width 1s linear",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Neon flower spinner (CSS only, indigo palette) ────────────────────── */

const RINGS = [
  { size: 160, dur: "3.2s",  delay: "0s",     color: "#6366f1", rev: false },
  { size: 136, dur: "2.4s",  delay: "-0.7s",  color: "#818cf8", rev: true  },
  { size: 112, dur: "1.9s",  delay: "-1.2s",  color: "#a78bfa", rev: false },
  { size: 90,  dur: "2.7s",  delay: "-0.4s",  color: "#c4b5fd", rev: true  },
  { size: 68,  dur: "1.6s",  delay: "-1.0s",  color: "#818cf8", rev: false },
  { size: 46,  dur: "2.1s",  delay: "-1.6s",  color: "#6366f1", rev: true  },
] as const;

function NeonSpinner() {
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      {/* Soft radial glow behind */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 68%)",
          filter: "blur(18px)",
          animation: "pulse 2.2s ease-in-out infinite",
        }}
      />

      {/* Rotating arcs */}
      {RINGS.map(({ size, dur, delay, color, rev }, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            top:  (160 - size) / 2,
            left: (160 - size) / 2,
            border: "2px solid transparent",
            borderTopColor:   color,
            borderRightColor: i % 2 === 0 ? color : "transparent",
            borderLeftColor:  i % 2 === 1 ? color : "transparent",
            filter: `drop-shadow(0 0 ${5 + i * 1.5}px ${color})`,
            animation: `spin ${dur} linear ${delay} infinite${rev ? " reverse" : ""}`,
          }}
        />
      ))}

      {/* Centre glow core */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "37%",
          background: "radial-gradient(circle, #a78bfa, #6366f1)",
          filter: "blur(6px)",
          opacity: 0.95,
          animation: "pulse 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}
