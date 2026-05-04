"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 5000;

const FUNNY_MESSAGES = [
  "Knock knock... anyone home? 🚪",
  "Pssst, server... rise and shine ☀️",
  "Server: 'just 5 more minutes...' 😴",
  "Brewing a coffee for the server ☕",
  "Gently poking it with a stick...",
  "Wakey wakey, eggs and bakey! 🍳",
  "Your hostel is worth the wait 🏠",
  "Server stretching... almost ready 🧘",
  "Sending a strongly worded letter 📨",
  "Turning it off and on again... 🔄",
];

const STAGES = [
  "Waking up server",
  "Loading your hostel",
  "Fetching tenants",
  "Getting details ready",
  "Almost there...",
];

const STAGE_DURATION_S = 12;

type Phase = "checking" | "sleeping" | "ready";

export function ServerWakeOverlay() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const phaseRef = useRef<Phase>("checking");
  const pollingRef = useRef(false);
  const sleepStartRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Elapsed counter + stage + message rotation while sleeping
  useEffect(() => {
    if (phase !== "sleeping") return;
    sleepStartRef.current = Date.now();
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - sleepStartRef.current) / 1000);
      setElapsed(secs);
      setStageIdx(Math.min(STAGES.length - 1, Math.floor(secs / STAGE_DURATION_S)));
    }, 1000);
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % FUNNY_MESSAGES.length);
    }, 4000);
    return () => { clearInterval(timer); clearInterval(msgTimer); };
  }, [phase]);

  async function initialCheck() {
    try {
      const res = await fetch("/api/keep-alive", {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) { phaseRef.current = "awake" as Phase; return; }
    } catch {}
    triggerSleeping();
  }

  function triggerSleeping() {
    if (pollingRef.current) return;
    pollingRef.current = true;
    sleepStartRef.current = 0;
    setPhase("sleeping");
    phaseRef.current = "sleeping";
    setVisible(true);
    setElapsed(0);
    setStageIdx(0);
    setMsgIdx(0);
    startPolling();
  }

  function startPolling() {
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
          // Show "Ready!" for 1.8s then fade out
          setTimeout(() => {
            setFading(true);
            setTimeout(() => setVisible(false), 700);
          }, 1800);
          return;
        }
      } catch {}
      if (pollingRef.current) setTimeout(poll, POLL_INTERVAL_MS);
    };
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  // Initial check on mount
  useEffect(() => {
    const isLocalApp = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocalApp || process.env.NEXT_PUBLIC_DISABLE_WAKE_OVERLAY === "1") {
      return;
    }

    void initialCheck();
  }, []);

  // Global fetch interceptor for mid-session 503s
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await orig(...args);
      if (res.status === 503 && phaseRef.current !== "sleeping") {
        const url = typeof args[0] === "string" ? args[0]
          : args[0] instanceof URL ? args[0].href
          : (args[0] as Request).url;
        if (url.startsWith("/api/") && !url.includes("keep-alive")) {
          triggerSleeping();
        }
      }
      return res;
    };
    return () => { window.fetch = orig; };
  }, []);

  if (!visible) return null;

  const isReady = phase === "ready";
  const progress = Math.min(100, (elapsed / (STAGE_DURATION_S * STAGES.length)) * 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s ease",
        background: "linear-gradient(180deg, rgba(9,9,18,0.97) 0%, rgba(5,5,14,0.99) 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="w-full max-w-sm rounded-t-[28px] border border-white/10 bg-[#0d0f1e] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 shadow-[0_-24px_80px_rgba(99,102,241,0.12)] sm:rounded-[28px] sm:pb-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(99,102,241,0.3)] bg-[linear-gradient(135deg,rgba(99,102,241,0.18)_0%,rgba(99,102,241,0.06)_100%)]">
            {isReady ? (
              <span className="text-3xl">✅</span>
            ) : (
              <span className="text-3xl" style={{ animation: "bounce 1.4s infinite" }}>🌙</span>
            )}
            {!isReady && (
              <span
                className="absolute inset-0 rounded-2xl border border-[rgba(99,102,241,0.35)]"
                style={{ animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }}
              />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 text-center">
          {isReady ? (
            <>
              <h2 className="text-xl font-bold text-white">All set! Loading your data...</h2>
              <p className="mt-1 text-sm text-[#4ade80]">Server is awake. Taking you in now.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">Waking up the server</h2>
              <p className="mt-1 min-h-[20px] text-sm text-[#818cf8] transition-all duration-500">
                {FUNNY_MESSAGES[msgIdx]}
              </p>
            </>
          )}
        </div>

        {/* Stages */}
        {!isReady && (
          <div className="mt-5 space-y-2">
            {STAGES.map((stage, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-500
                    ${done ? "border-[#4ade80] bg-[#22c55e]/20 text-[#4ade80]"
                      : active ? "border-[#818cf8] bg-[rgba(99,102,241,0.2)] text-[#818cf8]"
                      : "border-white/15 bg-white/[0.03] text-white/20"}`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`text-sm font-medium transition-all duration-500
                    ${done ? "text-[#4ade80]" : active ? "text-white" : "text-white/25"}`}
                  >
                    {stage}
                    {active && <span className="ml-1 inline-block animate-pulse text-[#818cf8]">...</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Progress bar */}
        {!isReady && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#818cf8_60%,#a5b4fc_100%)]"
                style={{ width: `${progress}%`, transition: "width 1s linear" }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/30">
              <span>{elapsed}s elapsed</span>
              <span>usually 30–60s</span>
            </div>
          </div>
        )}

        {/* Ready progress bar */}
        {isReady && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,#22c55e,#4ade80)]" style={{ transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-center">
          <p className="text-[11px] text-white/35">
            {isReady
              ? "✓ Your hostel, tenants and payments are all safe."
              : "Your data is safe. No need to refresh — this screen disappears automatically."}
          </p>
        </div>
      </div>
    </div>
  );
}
