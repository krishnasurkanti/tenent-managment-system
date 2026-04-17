"use client";

import { AlertCircle, Bell, Clock3 } from "lucide-react";
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
      <Card className="p-5 text-center text-white">
        <p className="text-sm font-semibold text-white">No hostel selected.</p>
        <Link href="/owner/create-hostel" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] px-4 text-sm font-semibold text-white">
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
    <div className={`space-y-4 text-white transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,#0f1425_0%,#0b101c_100%)] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Alerts center</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Notifications</h1>
            <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--fg-secondary)]">
              Tenants with overdue or upcoming rent that need a payment follow-up.
            </p>
          </div>
          <div className="grid min-w-22 gap-2 text-right lg:min-w-36">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--brand-soft)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--accent-electric)]">
              <Bell className="h-3.5 w-3.5" />
              {alerts.length}
            </div>
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">State</p>
              <p className="mt-1 text-sm font-semibold text-white">{alerts.length === 0 ? "Clear" : "Active"}</p>
            </div>
          </div>
        </div>
      </Card>

      {alerts.length === 0 ? (
        <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-6 text-center text-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]">
            <Bell className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-white">No active notifications.</p>
          <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">There are no overdue or urgent tenant payment alerts right now.</p>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {alerts.map(({ tenant, status }) => (
            <Card key={tenant.tenantId} className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-4 text-white shadow-[0_14px_30px_rgba(2,6,23,0.22)]">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    status.tone === "red"
                      ? "bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_12px_24px_rgba(220,38,38,0.24)]"
                      : "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_12px_24px_rgba(250,204,21,0.24)]"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{tenant.fullName}</p>
                      <p className="mt-1 truncate text-[11px] text-[color:var(--fg-secondary)]">
                        Room {tenant.assignment?.roomNumber} / Floor {tenant.assignment?.floorNumber}
                      </p>
                    </div>
                    <span className={ownerStatusClass(status.tone)}>{status.label}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MiniInfo label="Phone" value={tenant.phone} />
                    <MiniInfo label="Due" value={formatPaymentDate(tenant.nextDueDate)} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1 text-[11px] text-[color:var(--fg-secondary)]">
                      <Clock3 className="h-3.5 w-3.5" />
                      Needs payment follow-up
                    </div>
                    <Button
                      className="min-h-9 px-3 text-[12px]"
                      onClick={() => router.push(`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`)}
                    >
                      Pay now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-[24px] bg-[color:var(--surface-soft)]" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-[22px] bg-[color:var(--surface-soft)]" />
      ))}
    </div>
  );
}

