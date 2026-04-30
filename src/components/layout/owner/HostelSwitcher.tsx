"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useHostelContext } from "@/store/hostel-context";

const PLAN_HOSTEL_LIMITS: Record<string, number> = {
  starter: 1,
  growth: 2,
  pro: 3,
  scale: 5,
};

export function HostelSwitcher() {
  const router = useRouter();
  const { hostels, currentHostel, currentHostelId, selectHostel, loading, isSwitching } = useHostelContext();
  const [open, setOpen] = useState(false);
  const [gateChecking, setGateChecking] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [cachedLimit, setCachedLimit] = useState<{ limit: number; planId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const summaryLabel = useMemo(() => {
    if (hostels.length <= 1) return "1 hostel";
    return `${hostels.length} hostels`;
  }, [hostels.length]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleAddHostel = async () => {
    if (gateChecking) return;

    let limit = cachedLimit;
    if (!limit) {
      setGateChecking(true);
      try {
        const res = await fetch("/api/owner-billing");
        if (res.ok) {
          const data = (await res.json()) as { planId?: string; billing?: { hostelLimit?: number } };
          const planId = data.planId ?? "starter";
          const hostelLimit = data.billing?.hostelLimit ?? PLAN_HOSTEL_LIMITS[planId] ?? 1;
          limit = { limit: hostelLimit, planId };
          setCachedLimit(limit);
        } else {
          limit = { limit: 1, planId: "starter" };
        }
      } catch {
        limit = { limit: 1, planId: "starter" };
      } finally {
        setGateChecking(false);
      }
    }

    if (hostels.length < limit.limit) {
      setOpen(false);
      router.push("/owner/create-hostel");
    } else {
      setShowPaywall(true);
    }
  };

  if (loading) {
    return (
      <div className="hidden items-center gap-2 xl:flex">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
      </div>
    );
  }

  if (!hostels.length) return null;

  const paywallLimit = cachedLimit?.limit ?? 1;

  return (
    <>
      <div ref={containerRef} className="relative z-[60] hidden items-center gap-2 xl:flex">
        <div className="inline-flex min-h-10 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)] shadow-[0_10px_24px_rgba(2,6,23,0.18)]">
          Workspace
        </div>

        <div className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.18)]">
          <div className="rounded-xl bg-[linear-gradient(180deg,var(--cta)_0%,var(--cta-strong)_100%)] p-2 text-[#1c1400] shadow-[0_12px_22px_rgba(249,193,42,0.24)]">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Portfolio</p>
            <p className="text-[13px] font-semibold text-white">{summaryLabel}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex min-h-10 min-w-[17rem] max-w-[17rem] items-center justify-between gap-3 rounded-2xl border px-3.5 text-left shadow-sm transition",
            isSwitching
              ? "border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color:var(--surface-strong)] text-[color:var(--accent)] shadow-[0_0_0_1px_rgba(249,193,42,0.18),0_12px_28px_rgba(249,193,42,0.12)]"
              : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-primary)] shadow-[0_10px_24px_rgba(2,6,23,0.18)] hover:border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] hover:bg-[color:var(--surface-strong)]",
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Current Hostel</p>
            <p className="truncate text-[13px] font-semibold">{currentHostel?.hostelName ?? "Select Hostel"}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open ? "rotate-180" : "")} />
        </button>

        <button
          type="button"
          onClick={handleAddHostel}
          disabled={gateChecking}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color:var(--surface-soft)] px-3.5 text-[12px] font-semibold text-[color:var(--accent)] shadow-[0_10px_24px_rgba(2,6,23,0.18)] transition hover:bg-[color:var(--surface-strong)] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {gateChecking ? "..." : "Add Hostel"}
        </button>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+0.65rem)] z-[70] w-[22rem] rounded-[10px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.96)_100%)] p-3 shadow-[0_24px_60px_rgba(2,6,23,0.4)]">
            <div className="mb-2 flex items-center gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">
              <Building2 className="h-3 w-3" />
              All Hostels
            </div>

            <div className="space-y-1">
              {hostels.map((hostel) => {
                const selected = hostel.id === currentHostelId;
                return (
                  <button
                    key={hostel.id}
                    type="button"
                    onClick={() => { selectHostel(hostel.id); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      selected ? "bg-[color:var(--surface-strong)] text-[color:var(--accent)]" : "text-[color:var(--fg-primary)] hover:bg-[color:var(--surface-soft)]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{hostel.hostelName}</p>
                      <p className="truncate text-xs text-[color:var(--fg-secondary)]">{hostel.address}</p>
                    </div>
                    {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {showPaywall ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4" onClick={() => setShowPaywall(false)}>
          <div
            className="w-full max-w-sm rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color:var(--surface-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--accent)]">
                  <Building2 className="h-3.5 w-3.5" />
                  Hostel Limit Reached
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">Add Another Hostel</h3>
              </div>
              <button type="button" onClick={() => setShowPaywall(false)} className="rounded-xl p-1.5 text-white/40 hover:text-white/70">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">
              Your current plan includes <strong className="text-white">{paywallLimit} hostel{paywallLimit !== 1 ? "s" : ""}</strong>. You&apos;ve used all {paywallLimit}. Adding another hostel costs <strong className="text-white">Rs 199/month</strong> extra, billed with your regular plan.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => { setShowPaywall(false); setOpen(false); router.push("/owner/create-hostel"); }}
                className="w-full rounded-2xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-4 py-3 text-sm font-semibold text-[#1b1207] shadow-[0_12px_28px_rgba(240,175,47,0.22)] transition hover:brightness-105"
              >
                Add hostel — Rs 199/month extra
              </button>
              <button
                type="button"
                onClick={() => { setShowPaywall(false); setOpen(false); router.push("/owner/billing"); }}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
              >
                Upgrade plan for more hostels
              </button>
            </div>

            <p className="mt-3 text-[11px] text-[color:var(--fg-secondary)]">
              Upgrading your plan gives you more hostels included in the base price.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
