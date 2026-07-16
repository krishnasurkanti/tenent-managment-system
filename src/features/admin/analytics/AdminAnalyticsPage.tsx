"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchAdminAnalytics } from "@/services/admin/admin.service";
import type { AdminAnalyticsData } from "@/types/admin";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: next } = await fetchAdminAnalytics();
      setData(next);
    };
    void load();
  }, []);

  if (!data) {
    return <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--fg-secondary)]">Loading analytics…</div>;
  }

  const maxTenant = Math.max(1, ...data.tenantsPerHostel.map((item) => item.tenantCount));
  const maxRevenue = Math.max(1, ...data.revenuePerHostel.map((item) => item.revenue));

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Analytics</p>
        <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Platform analytics</h1>
        <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Tenants, revenue, growth trends, and most active hostels.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChartCard title="Tenants per hostel">
          {data.tenantsPerHostel.map((item) => (
            <Bar key={item.hostelName} label={item.hostelName} valueLabel={String(item.tenantCount)} pct={(item.tenantCount / maxTenant) * 100} tone="brand" />
          ))}
        </ChartCard>
        <ChartCard title="Revenue per hostel">
          {data.revenuePerHostel.map((item) => (
            <Bar key={item.hostelName} label={item.hostelName} valueLabel={`Rs ${item.revenue.toLocaleString("en-IN")}`} pct={(item.revenue / maxRevenue) * 100} tone="success" />
          ))}
        </ChartCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChartCard title="Growth trends">
          <p className="text-sm text-[color:var(--fg-secondary)]">Month: {data.growthTrends.monthKey}</p>
          <p className="mt-2 text-sm text-[color:var(--fg-primary)]">New hostels: {data.growthTrends.newHostels}</p>
          <p className="text-sm text-[color:var(--fg-primary)]">New tenants: {data.growthTrends.newTenants}</p>
        </ChartCard>
        <ChartCard title="Most active hostels">
          {data.mostActiveHostels.map((item) => (
            <p key={item.hostelName} className="text-sm text-[color:var(--fg-primary)]">
              {item.hostelName}: <span className="font-semibold">{item.tenantCount}</span> tenants
            </p>
          ))}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">{title}</h2>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </Card>
  );
}

function Bar({ label, valueLabel, pct, tone }: { label: string; valueLabel: string; pct: number; tone: "brand" | "success" }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[color:var(--fg-secondary)]">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{valueLabel}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[color:var(--surface-strong)]">
        <div className={`h-2.5 rounded-full ${tone === "success" ? "bg-[color:var(--success)]" : "bg-[color:var(--brand)]"}`} style={{ width: `${Math.max(6, Math.min(pct, 100))}%` }} />
      </div>
    </div>
  );
}
