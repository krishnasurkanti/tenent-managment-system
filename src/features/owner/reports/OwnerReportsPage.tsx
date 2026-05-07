"use client";

import { useRef } from "react";
import { Download, FileBarChart2, TrendingUp, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { ownerPanelClass } from "@/components/ui/owner-theme";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { getDueStatus } from "@/utils/payment";

export default function OwnerReportsPage() {
  const { currentHostel, currentHostelId } = useHostelContext();
  const { tenants: allTenants, loading } = useOwnerTenants(currentHostelId);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const tenants = currentHostel
    ? allTenants.filter((t) => t.assignment?.hostelId === currentHostel.id)
    : [];

  const overdueCount = tenants.filter((t) => getDueStatus(t.nextDueDate).tone === "red").length;
  const dueSoonCount = tenants.filter((t) => {
    const tone = getDueStatus(t.nextDueDate).tone;
    return tone === "orange" || tone === "yellow";
  }).length;
  const paidCount = tenants.filter((t) => getDueStatus(t.nextDueDate).tone === "green").length;
  const assignedCount = tenants.filter((t) => !!t.assignment).length;
  const totalRent = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const collectedRent = tenants
    .filter((t) => getDueStatus(t.nextDueDate).tone === "green")
    .reduce((sum, t) => sum + t.rentPaid, 0);
  const collectionRate = totalRent > 0 ? Math.round((collectedRent / totalRent) * 100) : 0;

  const exportHref = currentHostelId
    ? `/api/tenants/export?hostelId=${encodeURIComponent(currentHostelId)}`
    : "/api/tenants/export";

  return (
    <div className="space-y-3">
      <OwnerPageHero
        eyebrow="Reports"
        title="Reports centre"
        description="Occupancy, payment collection, and tenant summaries for your hostel."
        badge={
          <span className="inline-flex rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">
            {loading ? "Loading…" : `${tenants.length} tenants`}
          </span>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerQuickStat label="Total Tenants" value={loading ? "—" : String(tenants.length)} helper="In current hostel" />
        <OwnerQuickStat label="Assigned" value={loading ? "—" : String(assignedCount)} helper="With room assignment" />
        <OwnerQuickStat label="Collection Rate" value={loading ? "—" : `${collectionRate}%`} helper="Paid vs expected" />
        <OwnerQuickStat label="Overdue" value={loading ? "—" : String(overdueCount)} helper="Past due date" />
      </div>

      {!loading && tenants.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className={`p-4 ${ownerPanelClass}`}>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-white">Payment Summary</p>
            </div>
            <div className="space-y-2">
              <SummaryRow label="Expected monthly" value={`Rs ${totalRent.toLocaleString("en-IN")}`} />
              <SummaryRow label="Collected this cycle" value={`Rs ${collectedRent.toLocaleString("en-IN")}`} color="green" />
              <SummaryRow label="Paid on time" value={`${paidCount} tenants`} color="green" />
              <SummaryRow label="Due soon" value={`${dueSoonCount} tenants`} color="yellow" />
              <SummaryRow label="Overdue" value={`${overdueCount} tenants`} color="red" />
            </div>
          </Card>

          <Card className={`p-4 ${ownerPanelClass}`}>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-white">Occupancy Summary</p>
            </div>
            <div className="space-y-2">
              <SummaryRow label="Total tenants" value={String(tenants.length)} />
              <SummaryRow label="Assigned to rooms" value={String(assignedCount)} color="green" />
              <SummaryRow label="Awaiting assignment" value={String(tenants.length - assignedCount)} />
            </div>
          </Card>
        </div>
      ) : null}

      <Card className={`p-4 ${ownerPanelClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
              <FileBarChart2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Export Tenant Data</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">
                Download all tenant records as a CSV file — name, contact, room, rent, and status.
              </p>
            </div>
          </div>
          <a
            ref={downloadRef}
            href={exportHref}
            download
            className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-4 text-[13px] font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)] transition hover:brightness-110 sm:shrink-0"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </div>
      </Card>

      <Card className={`p-4 ${ownerPanelClass}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-white">More reports</p>
        </div>
        <p className="text-[12px] text-[color:var(--fg-secondary)]">
          Detailed payment history, occupancy trends, and income forecasts are coming in a future update.
        </p>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "green" | "yellow" | "red";
}) {
  const valueColor =
    color === "green"
      ? "text-emerald-400"
      : color === "yellow"
        ? "text-amber-400"
        : color === "red"
          ? "text-red-400"
          : "text-white";

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
      <span className="text-[12px] text-[color:var(--fg-secondary)]">{label}</span>
      <span className={`text-[12px] font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}
