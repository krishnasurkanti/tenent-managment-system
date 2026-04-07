"use client";

import Link from "next/link";
import { AlertCircle, Bell, Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";

export default function OwnerNotificationsPage() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();

  if (hostelLoading || tenantLoading) {
    return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading notifications...</Card>;
  }

  if (!currentHostel) {
    return (
      <Card className="p-5 text-center">
        <p className="text-sm font-semibold text-slate-800">No hostel selected.</p>
        <Link
          href="/owner/create-hostel"
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-4 text-[12px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-95"
        >
          Create Hostel
        </Link>
      </Card>
    );
  }

  const alerts = allTenants
    .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
    .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
    .filter(({ status }) => status.tone === "red" || status.tone === "orange")
    .sort((left, right) => left.status.priority - right.status.priority);

  return (
    <div className={`space-y-4 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Notifications</p>
            <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-slate-800 sm:text-[1.55rem]">
              Alerts Center
            </h1>
            <p className="mt-1 text-[12px] text-slate-500">All important alerts for {currentHostel.hostelName} in one place.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--pill-gradient)] px-3 py-1.5 text-[12px] font-semibold text-indigo-700">
            <Bell className="h-3.5 w-3.5" />
            {alerts.length} active alert{alerts.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.96)_100%)] p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-emerald-600">
            <Bell className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">No active notifications.</p>
          <p className="mt-1 text-sm text-slate-500">There are no overdue or urgent tenant payment alerts right now.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {alerts.map(({ tenant, status }) => (
            <Card
              key={tenant.tenantId}
              className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.96)_100%)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      status.tone === "red"
                        ? "bg-[var(--danger-soft)] text-rose-600"
                        : "bg-[var(--warning-soft)] text-orange-600"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800">{tenant.fullName}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Room {tenant.assignment?.roomNumber} | Floor {tenant.assignment?.floorNumber}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">Phone {tenant.phone}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Due date: {formatPaymentDate(tenant.nextDueDate)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      status.tone === "red"
                        ? "bg-[var(--danger-soft)] text-rose-700"
                        : "bg-[var(--warning-soft)] text-orange-700"
                    }`}
                  >
                    {status.label}
                  </span>
                  <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Needs payment follow-up
                  </div>
                  <Link
                    href="/owner/payments"
                    className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--action-gradient)] px-3 text-[12px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-95"
                  >
                    Open Payments
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
