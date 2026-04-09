"use client";

import { useEffect, useState } from "react";

type Overview = {
  totals: {
    hostels: number;
    activeTenants: number;
    monthlyRevenue: number;
    activeHostels: number;
    inactiveHostels: number;
  };
  growth: {
    newTenantsThisMonth: number;
    newHostelsThisMonth: number;
    tenantGrowthDelta: number;
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const next = (await response.json()) as Overview;
      setData(next);
    };
    void load();
  }, []);

  if (!data) {
    return <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600">Loading admin dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(240,249,255,0.95)_100%)] p-5 shadow-[0_20px_44px_rgba(14,165,233,0.1)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Control Center</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Platform-wide metrics across all businesses, hostels, and tenants.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Hostels" value={String(data.totals.hostels)} helper="All onboarded hostels" />
        <StatCard label="Active Tenants" value={String(data.totals.activeTenants)} helper="Across all hostels" />
        <StatCard label="Monthly Revenue" value={`₹${data.totals.monthlyRevenue.toLocaleString("en-IN")}`} helper="Current billing month" />
        <StatCard label="Active Hostels" value={String(data.totals.activeHostels)} helper="Operating hostels" />
        <StatCard label="Inactive Hostels" value={String(data.totals.inactiveHostels)} helper="Deactivated/suspended" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="New Tenants" value={String(data.growth.newTenantsThisMonth)} helper="Added this month" />
        <StatCard label="New Hostels" value={String(data.growth.newHostelsThisMonth)} helper="Created this month" />
        <StatCard
          label="Tenant Growth"
          value={`${data.growth.tenantGrowthDelta >= 0 ? "+" : ""}${data.growth.tenantGrowthDelta}`}
          helper="Vs previous month"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
