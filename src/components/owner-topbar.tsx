"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Bell, Menu, Search } from "lucide-react";
import { HostelSwitcher } from "@/components/hostel-switcher";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";

const ALERT_SEEN_PREFIX = "dashboard-payment-alert-seen";

export function OwnerTopbar() {
  const pathname = usePathname();
  const { currentHostel } = useHostelContext();
  const { tenants, loading } = useOwnerTenants();
  const [open, setOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm">
          <Menu className="h-4 w-4" />
        </button>
        <HostelSwitcher />
      </div>

      <div className="flex items-center gap-2.5">
        <label className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] text-slate-600 outline-none transition focus:border-violet-300"
          />
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {alerts.length}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-30 w-[320px] rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.14)]">
              <div className="flex items-center justify-between gap-3 px-1 pb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Payment Alerts</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {alerts.length > 0 ? `${alerts.length} action needed` : "No dues today"}
                  </p>
                </div>
                {alerts.length > 0 ? (
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-600">
                    Daily
                  </span>
                ) : null}
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[13px] text-slate-500">
                    No tenants are due today or overdue in this hostel.
                  </div>
                ) : (
                  alerts.map(({ tenant, status }) => (
                    <Link
                      key={tenant.tenantId}
                      href="/owner/payments"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-violet-200 hover:bg-violet-50/50"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          status.tone === "red" ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-orange-600"
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
        <Link href="/owner/settings" className="rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            S
          </div>
        </Link>
      </div>
    </header>
  );
}
