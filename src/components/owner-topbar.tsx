"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, House, Menu, Search } from "lucide-react";
import { HostelSwitcher } from "@/components/hostel-switcher";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { getDueStatus } from "@/lib/payment-utils";

export function OwnerTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentHostel, hostels } = useHostelContext();
  const { tenants } = useOwnerTenants();
  const isDashboard = pathname === "/owner/dashboard";
  const isNotifications = pathname === "/owner/notifications";

  const alerts = useMemo(() => {
    if (!currentHostel) {
      return [];
    }

    return tenants
      .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
      .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
      .filter(({ status }) => status.tone === "red" || status.tone === "orange")
      .sort((left, right) => left.status.priority - right.status.priority);
  }, [currentHostel, tenants]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/owner/dashboard");
  };

  return (
    <header className="sticky top-0 z-50 isolate flex items-center justify-between border-b border-white/80 bg-white/92 px-3 py-2.5 backdrop-blur-xl md:px-5 xl:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="rounded-2xl border border-white/70 bg-[var(--surface-gradient)] p-2.5 text-slate-600 shadow-sm lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="rounded-2xl border border-white/70 bg-[var(--surface-gradient)] p-2.5 text-slate-600 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Link
          href="/owner/dashboard"
          aria-label="Go to dashboard"
          className={`rounded-2xl border bg-[var(--surface-gradient)] p-2.5 shadow-sm transition ${
            isDashboard
              ? "border-indigo-200 text-indigo-600"
              : "border-white/70 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
          }`}
        >
          <House className="h-4 w-4" />
        </Link>
        <div className="hidden xl:block">
          <HostelSwitcher />
        </div>
        <button
          type="button"
          onClick={() => router.push("/owner/settings")}
          className="min-w-0 rounded-2xl border border-white/80 bg-[var(--surface-gradient)] px-3 py-2 text-left shadow-sm xl:hidden"
        >
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Hostel</p>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-slate-800">{currentHostel?.hostelName ?? "Select"}</p>
            {hostels.length > 1 ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <label className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-400" />
          <input
            type="text"
            placeholder="Search tenants, rooms, payments..."
            className="w-72 rounded-full border border-white/80 bg-[var(--surface-gradient)] py-2.5 pl-10 pr-4 text-[13px] text-slate-600 outline-none transition focus:border-indigo-300"
          />
        </label>

        <Link
          href="/owner/notifications"
          aria-label="Open notifications"
          className={`relative rounded-2xl border bg-[var(--surface-gradient)] p-2.5 text-slate-500 shadow-sm transition ${
            isNotifications ? "border-indigo-200 text-indigo-600" : "border-white/70 hover:border-indigo-200 hover:text-indigo-600"
          }`}
        >
          <Bell className="h-4 w-4" />
          {alerts.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {alerts.length}
            </span>
          ) : null}
        </Link>

        <Link href="/owner/settings" className="rounded-full border border-white/70 bg-[var(--surface-gradient)] p-1 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pill-gradient)] text-xs font-semibold text-indigo-700">
            S
          </div>
        </Link>
      </div>
    </header>
  );
}
