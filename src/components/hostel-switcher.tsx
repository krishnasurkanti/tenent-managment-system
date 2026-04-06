"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHostelContext } from "@/components/hostel-context-provider";

export function HostelSwitcher() {
  const { hostels, currentHostel, currentHostelId, selectHostel, loading, isSwitching } = useHostelContext();
  const [open, setOpen] = useState(false);

  const summaryItems = useMemo(() => {
    if (hostels.length <= 3) {
      return hostels.map((hostel) => hostel.hostelName);
    }

    return [
      hostels[0]?.hostelName ?? "",
      hostels[1]?.hostelName ?? "",
      `+${hostels.length - 2} more`,
    ].filter(Boolean);
  }, [hostels]);

  if (loading) {
    return (
      <div className="hidden items-center gap-2 xl:flex">
        <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-52 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!hostels.length) {
    return null;
  }

  return (
    <div className="relative hidden items-center gap-2 xl:flex">
      <div className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 shadow-sm">
        Hostels
      </div>

      <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm">
        {summaryItems.map((item) => (
          <span key={item} className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-medium text-slate-600">
            {item}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex min-h-10 min-w-[12.5rem] items-center justify-between gap-3 rounded-xl border px-3.5 text-left shadow-sm transition",
          isSwitching
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/50",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current Hostel</p>
          <p className="truncate text-[13px] font-semibold">{currentHostel?.hostelName ?? "Select Hostel"}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.65rem)] z-30 w-[25rem] rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
          <div className="mb-2 flex items-center gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{hostel.hostelName}</p>
                    <p className="truncate text-xs text-slate-500">{hostel.address}</p>
                  </div>
                  {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-slate-200 pt-2">
            <Link
              href="/owner/create-hostel"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-violet-700 transition hover:bg-violet-50"
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
