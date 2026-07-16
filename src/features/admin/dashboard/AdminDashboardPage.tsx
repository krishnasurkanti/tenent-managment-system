"use client";

import { useQuery } from "@tanstack/react-query";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { fetchAdminOverview } from "@/services/admin/admin.service";

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data } = await fetchAdminOverview();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <ProcessingPill label="Preparing admin overview" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-24 rounded-[var(--radius-lg)]" />)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-24 rounded-[var(--radius-lg)]" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] p-4 text-sm font-medium text-[color:var(--error)]">
        Failed to load dashboard. Refresh the page to try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--fg-secondary)]">Control center</p>
        <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Admin dashboard</h1>
        <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Platform-wide metrics across all businesses, hostels, and tenants.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total hostels" value={data.totals.hostels} helper="All onboarded" />
        <StatCard label="Active tenants" value={data.totals.activeTenants} helper="Across all hostels" tone="success" />
        <StatCard label="Monthly revenue" value={`Rs ${data.totals.monthlyRevenue.toLocaleString("en-IN")}`} helper="Current billing month" />
        <StatCard label="Active hostels" value={data.totals.activeHostels} helper="Operating" tone="success" />
        <StatCard label="Inactive hostels" value={data.totals.inactiveHostels} helper="Suspended" tone={data.totals.inactiveHostels ? "warning" : "plain"} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="New tenants" value={data.growth.newTenantsThisMonth} helper="Added this month" />
        <StatCard label="New hostels" value={data.growth.newHostelsThisMonth} helper="Created this month" />
        <StatCard label="Tenant growth" value={`${data.growth.tenantGrowthDelta >= 0 ? "+" : ""}${data.growth.tenantGrowthDelta}`} helper="Vs previous month" tone={data.growth.tenantGrowthDelta >= 0 ? "success" : "danger"} />
      </div>
    </div>
  );
}
