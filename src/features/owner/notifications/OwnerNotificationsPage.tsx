"use client";

import Link from "next/link";
import { AlertCircle, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { ownerStatusClass } from "@/components/ui/owner-theme";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";

export default function OwnerNotificationsPage() {
  const router = useRouter();
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);

  if (hostelLoading || tenantLoading) {
    return <LoadingState />;
  }

  if (!currentHostel) {
    return (
      <Card className="p-4 text-center text-white">
        <p className="text-sm font-semibold">No hostel selected.</p>
        <Link href="/owner/create-hostel" className="mt-3 inline-flex min-h-9 items-center justify-center rounded-xl bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] px-4 text-sm font-semibold text-white">
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
    <div className={`space-y-3 text-white transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      {/* Compact hero */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,#0f1425_0%,#0b101c_100%)] px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-white">Notifications</p>
          <span className="text-[11px] text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${alerts.length === 0 ? "border-[#4ade80]/40 bg-[#22c55e]/10 text-[#4ade80]" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
            <Bell className="h-3 w-3" />
            {alerts.length === 0 ? "All clear" : `${alerts.length} need attention`}
          </span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] px-4 py-6 text-center text-white">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] shadow-[0_8px_20px_rgba(34,197,94,0.24)]">
            <Bell className="h-4 w-4" />
          </div>
          <p className="mt-2 text-sm font-semibold">No active notifications.</p>
          <p className="mt-0.5 text-xs text-[color:var(--fg-secondary)]">No overdue or urgent alerts right now.</p>
        </Card>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {alerts.map(({ tenant, status }) => (
            <div key={tenant.tenantId} className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] px-3 py-3 shadow-[0_10px_24px_rgba(2,6,23,0.18)]">
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${status.tone === "red" ? "bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_8px_16px_rgba(220,38,38,0.24)]" : "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006]"}`}>
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{tenant.fullName}</p>
                      <p className="truncate text-[11px] text-[color:var(--fg-secondary)]">
                        Room {tenant.assignment?.roomNumber} · Floor {tenant.assignment?.floorNumber} · {tenant.phone}
                      </p>
                    </div>
                    <span className={ownerStatusClass(status.tone)}>{status.label}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[color:var(--fg-secondary)]">Due {formatPaymentDate(tenant.nextDueDate)}</span>
                    <Button
                      className="h-8 px-3 text-[11px]"
                      onClick={() => router.push(`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`)}
                    >
                      Pay now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-14 animate-pulse rounded-[10px] bg-[color:var(--surface-soft)]" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-[8px] bg-[color:var(--surface-soft)]" />
      ))}
    </div>
  );
}
