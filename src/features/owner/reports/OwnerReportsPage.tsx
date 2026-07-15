"use client";

import { useEffect, useState } from "react";
import { Download, FileBarChart2, TrendingUp, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { getDueStatus } from "@/utils/payment";
import type { FinanceLedgerEntry } from "@/types/finance-ledger";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function OwnerReportsPage() {
  const { currentHostel, currentHostelId } = useHostelContext();
  const { tenants: allTenants, loading } = useOwnerTenants(currentHostelId);
  const [ledgerEntries, setLedgerEntries] = useState<FinanceLedgerEntry[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect -- clear/replace ledger when hostel changes */
  useEffect(() => {
    if (!currentHostelId) {
      setLedgerEntries([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/finance-ledger?hostelId=${encodeURIComponent(currentHostelId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { entries: [] })
      .then((data: { entries?: FinanceLedgerEntry[] }) => {
        if (!cancelled) setLedgerEntries(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch(() => {
        if (!cancelled) setLedgerEntries([]);
      });
    return () => { cancelled = true; };
  }, [currentHostelId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tenants = currentHostel ? allTenants.filter((t) => t.assignment?.hostelId === currentHostel.id) : [];

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
  const advanceCollected = ledgerEntries.filter((e) => e.type === "advance_collected").reduce((s, e) => s + e.amount, 0);
  const serviceFeeCollected = ledgerEntries.filter((e) => e.type === "service_fee_collected").reduce((s, e) => s + e.amount, 0);
  const advanceRefunded = ledgerEntries.filter((e) => e.type === "advance_refund").reduce((s, e) => s + e.amount, 0);
  // O-20: advance is a refundable liability, not income — exclude from gross income
  const grossIncome = collectedRent + serviceFeeCollected;
  const netAfterRefunds = grossIncome - advanceRefunded;

  const exportHref = currentHostelId ? `/api/tenants/export?hostelId=${encodeURIComponent(currentHostelId)}` : "/api/tenants/export";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Reports</p>
          <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Reports centre</h1>
          <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Occupancy, collection, and tenant summaries.</p>
        </div>
        <span className="mt-1 shrink-0 rounded-full border border-[color:color-mix(in_srgb,var(--brand)_35%,transparent)] bg-[color:var(--brand-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--accent)]">
          {loading ? "Loading…" : `${tenants.length} tenants`}
        </span>
      </header>

      {/* ── Summary ── */}
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Total tenants" value={loading ? "—" : tenants.length} helper="Current hostel" />
        <StatCard label="Assigned" value={loading ? "—" : assignedCount} helper="With room" tone={assignedCount ? "success" : "plain"} />
        <StatCard label="Collection rate" value={loading ? "—" : `${collectionRate}%`} helper="Paid vs expected" />
        <StatCard label="Overdue" value={loading ? "—" : overdueCount} helper="Past due date" tone={overdueCount ? "danger" : "plain"} />
      </section>

      {!loading && tenants.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <ReportCard icon={<Wallet size={16} />} title="Payment summary">
            <SummaryRow label="Expected monthly" value={inr(totalRent)} />
            <SummaryRow label="Collected this cycle" value={inr(collectedRent)} color="green" />
            <SummaryRow label="Paid on time" value={`${paidCount} tenants`} color="green" />
            <SummaryRow label="Due soon" value={`${dueSoonCount} tenants`} color="yellow" />
            <SummaryRow label="Overdue" value={`${overdueCount} tenants`} color="red" />
          </ReportCard>

          <ReportCard icon={<FileBarChart2 size={16} />} title="Advance & service ledger">
            <SummaryRow label="Advance collected" value={inr(advanceCollected)} color="green" />
            <SummaryRow label="Service fee collected" value={inr(serviceFeeCollected)} color="green" />
            <SummaryRow label="Advance refund debit" value={inr(advanceRefunded)} color={advanceRefunded > 0 ? "red" : "default"} />
            <SummaryRow label="Net after refunds" value={inr(netAfterRefunds)} color={netAfterRefunds >= 0 ? "green" : "red"} />
          </ReportCard>

          <ReportCard icon={<Users size={16} />} title="Occupancy summary">
            <SummaryRow label="Total tenants" value={String(tenants.length)} />
            <SummaryRow label="Assigned to rooms" value={String(assignedCount)} color="green" />
            <SummaryRow label="Awaiting assignment" value={String(tenants.length - assignedCount)} />
          </ReportCard>
        </section>
      ) : null}

      <ReportCard icon={<FileBarChart2 size={16} />} title="Export tenant data">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-[color:var(--fg-secondary)]">
            Download all tenant records as CSV — name, contact, room, rent, and status.
          </p>
          <a
            href={exportHref}
            download
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-brand)] hover:brightness-110"
          >
            <Download size={16} /> Download CSV
          </a>
        </div>
      </ReportCard>

      <ReportCard icon={<TrendingUp size={16} />} title="More reports">
        <p className="text-[12px] text-[color:var(--fg-secondary)]">
          Detailed payment history, occupancy trends, and income forecasts are coming in a future update.
        </p>
      </ReportCard>
    </div>
  );
}

function ReportCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">{icon}</span>
        <p className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">{title}</p>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

function SummaryRow({ label, value, color = "default" }: { label: string; value: string; color?: "default" | "green" | "yellow" | "red" }) {
  const valueColor =
    color === "green" ? "text-[color:var(--success)]"
      : color === "yellow" ? "text-[color:var(--warning)]"
        : color === "red" ? "text-[color:var(--error)]"
          : "text-[color:var(--fg-primary)]";
  return (
    <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
      <span className="text-[12px] text-[color:var(--fg-secondary)]">{label}</span>
      <span className={`text-[12px] font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}
