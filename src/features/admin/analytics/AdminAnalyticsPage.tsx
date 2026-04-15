"use client";

import { useEffect, useState } from "react";
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

  if (!data) return <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600">Loading analytics...</div>;

  const maxTenant = Math.max(1, ...data.tenantsPerHostel.map((item) => item.tenantCount));
  const maxRevenue = Math.max(1, ...data.revenuePerHostel.map((item) => item.revenue));

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Tenants, revenue, growth trends, and most active hostels.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Tenants per Hostel">
          {data.tenantsPerHostel.map((item) => (
            <Bar key={item.hostelName} label={item.hostelName} valueLabel={String(item.tenantCount)} pct={(item.tenantCount / maxTenant) * 100} tone="sky" />
          ))}
        </Card>
        <Card title="Revenue per Hostel">
          {data.revenuePerHostel.map((item) => (
            <Bar
              key={item.hostelName}
              label={item.hostelName}
              valueLabel={`Rs ${item.revenue.toLocaleString("en-IN")}`}
              pct={(item.revenue / maxRevenue) * 100}
              tone="green"
            />
          ))}
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Growth Trends">
          <p className="text-sm text-slate-600">Month: {data.growthTrends.monthKey}</p>
          <p className="mt-2 text-sm text-slate-700">New Hostels: {data.growthTrends.newHostels}</p>
          <p className="text-sm text-slate-700">New Tenants: {data.growthTrends.newTenants}</p>
        </Card>
        <Card title="Most Active Hostels">
          {data.mostActiveHostels.map((item) => (
            <p key={item.hostelName} className="text-sm text-slate-700">
              {item.hostelName}: <span className="font-semibold">{item.tenantCount}</span> tenants
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Bar({
  label,
  valueLabel,
  pct,
  tone,
}: {
  label: string;
  valueLabel: string;
  pct: number;
  tone: "sky" | "green";
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{valueLabel}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100">
        <div
          className={`h-2.5 rounded-full ${tone === "green" ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${Math.max(6, Math.min(pct, 100))}%` }}
        />
      </div>
    </div>
  );
}
