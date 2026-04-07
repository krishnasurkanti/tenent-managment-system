"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Bell, House, Menu, Search } from "lucide-react";
import { HostelSwitcher } from "@/components/hostel-switcher";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";

const ALERT_SEEN_PREFIX = "dashboard-payment-alert-seen";

export function OwnerTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentHostel } = useHostelContext();
  const { tenants, loading } = useOwnerTenants();
  const [open, setOpen] = useState(false);
  const isDashboard = pathname === "/owner/dashboard";

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

  useEffect(() => {
    if (loading || pathname !== "/owner/dashboard" || !currentHostel || alerts.length === 0) {
      return;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `${ALERT_SEEN_PREFIX}-${currentHostel.id}`;
    const lastSeen = window.localStorage.getItem(storageKey);

    if (lastSeen === todayKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 0);

    window.localStorage.setItem(storageKey, todayKey);
    return () => window.clearTimeout(timer);
  }, [alerts.length, currentHostel, loading, pathname]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/owner/dashboard");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/60 bg-white/55 px-3 py-3 backdrop-blur-xl md:px-6">
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
              ? "border-violet-200 text-violet-600"
              : "border-white/70 text-slate-600 hover:border-violet-200 hover:text-violet-600"
          }`}
        >
          <House className="h-4 w-4" />
        </Link>
        <HostelSwitcher />
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <label className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 rounded-full border border-white/80 bg-[var(--surface-gradient)] py-2.5 pl-10 pr-4 text-[13px] text-slate-600 outline-none transition focus:border-violet-300"
          />
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="relative rounded-2xl border border-white/70 bg-[var(--surface-gradient)] p-2.5 text-slate-500 shadow-sm"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {alerts.length}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-30 w-[min(320px,calc(100vw-1.5rem))] rounded-[26px] border border-white/70 bg-[var(--surface-gradient)] p-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3 px-1 pb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Payment Alerts</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {alerts.length > 0 ? `${alerts.length} action needed` : "No dues today"}
                  </p>
                </div>
                {alerts.length > 0 ? (
                    <span className="rounded-full bg-[linear-gradient(90deg,#ffe8f0_0%,#ffdbe7_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-600">
                    Daily
                  </span>
                ) : null}
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-4 text-[13px] text-slate-500">
                    No tenants are due today or overdue in this hostel.
                  </div>
                ) : (
                  alerts.map(({ tenant, status }) => (
                    <Link
                      key={tenant.tenantId}
                      href="/owner/payments"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-3 transition hover:border-violet-200 hover:bg-[var(--pill-gradient)]"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          status.tone === "red"
                            ? "bg-[linear-gradient(90deg,#ffe8f0_0%,#ffdbe7_100%)] text-rose-600"
                            : "bg-[linear-gradient(90deg,#fff0d6_0%,#ffe3cc_100%)] text-orange-600"
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-800">{tenant.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Room {tenant.assignment?.roomNumber} • Floor {tenant.assignment?.floorNumber}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${status.tone === "red" ? "text-rose-600" : "text-orange-600"}`}>
                          {status.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Due date: {formatPaymentDate(tenant.nextDueDate)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        <Link href="/owner/settings" className="rounded-full border border-white/70 bg-[var(--surface-gradient)] p-1 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pill-gradient)] text-xs font-semibold text-violet-700">
            S
          </div>
        </Link>
      </div>
    </header>
  );
}
