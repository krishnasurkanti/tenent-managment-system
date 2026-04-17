"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { useHostelContext } from "@/store/hostel-context";

export function HostelSwitcher() {
  const { hostels, currentHostel, currentHostelId, selectHostel, loading, isSwitching } = useHostelContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const summaryLabel = useMemo(() => {
    if (hostels.length <= 1) {
      return "1 hostel";
    }

    return `${hostels.length} hostels`;
  }, [hostels.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (loading) {
    return (
      <div className="hidden items-center gap-2 xl:flex">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
      </div>
    );
  }

  if (!hostels.length) {
    return null;
  }

  return (
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
                  onClick={() => {
                    selectHostel(hostel.id);
                    setOpen(false);
                  }}
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

          <div className="mt-2 border-t border-[color:var(--border)] pt-2">
            <Link
              href="/owner/create-hostel"
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--surface-soft)]"
              onClick={() => setOpen(false)}
            >
              <Plus className="h-4 w-4" />
              Add New Hostel
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
