"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, LogOut, Plus, ServerCog, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";

type OwnerRow = {
  id: string;
  username: string;
  name: string;
  createdAt: string;
  status: "active" | "inactive";
};

type OwnerStats = {
  ownerId: string;
  hostelCount: number;
  hostelNames: string[];
  tenantCount: number;
};

function getPlanLabel(tenantCount: number) {
  if (tenantCount > 150) return { label: "Founding", color: "bg-purple-500/15 text-purple-300" };
  if (tenantCount > 60) return { label: "Pro", color: "bg-blue-500/15 text-blue-300" };
  return { label: "Starter", color: "bg-white/10 text-white/60" };
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [stats, setStats] = useState<Record<string, OwnerStats>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersRes, statsRes] = await Promise.all([
        fetch("/api/super-admin/owners"),
        fetch("/api/super-admin/owner-stats"),
      ]);
      const ownersData = (await ownersRes.json()) as { owners?: OwnerRow[] };
      const statsData = (await statsRes.json()) as { stats?: OwnerStats[] };
      setOwners(ownersData.owners ?? []);
      const map: Record<string, OwnerStats> = {};
      for (const s of statsData.stats ?? []) map[s.ownerId] = s;
      setStats(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleLogout = async () => {
    await csrfFetch("/api/auth/admin/logout", { method: "POST" });
    router.replace("/super-admin/login");
    router.refresh();
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0f172a] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#0d1526] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Super Admin</p>
              <p className="text-xs text-white/40">Control Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/70 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none">
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/super-admin/access-management")}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition hover:bg-white/[0.07]"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#f7bf53]" />
              <div>
                <p className="text-sm font-semibold text-white">Access Management</p>
                <p className="text-xs text-white/40">Manage owner accounts &amp; credentials</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-white/30" />
          </button>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#f7bf53]" />
              <div>
                <p className="text-sm font-semibold text-white">{owners.length} Owner{owners.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-white/40">Registered on platform</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="truncate text-xl font-semibold text-white">Owner Accounts</h1>
            <p className="mt-0.5 truncate text-sm text-white/40">
              {owners.length} owner{owners.length !== 1 ? "s" : ""} registered. Share credentials offline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/super-admin/access-management?new=1")}
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-4 py-2.5 text-sm font-semibold text-[#1b1207] shadow-[0_14px_28px_rgba(240,175,47,0.24)]"
          >
            <Plus className="h-4 w-4" />
            Add Owner
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm font-medium text-white/40">No owner accounts yet.</p>
            <p className="mt-1 text-xs text-white/25">Click Add Owner to create an account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Active Tenants</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => {
                  const ownerStats = stats[owner.id];
                  const tenantCount = ownerStats?.tenantCount ?? 0;
                  const plan = getPlanLabel(tenantCount);
                  return (
                    <tr key={owner.id} className="border-t border-white/8 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{owner.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/60">{owner.username}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${plan.color}`}>
                          {plan.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white">{tenantCount}</span>
                        {ownerStats?.hostelCount ? (
                          <span className="ml-1.5 text-xs text-white/35">{ownerStats.hostelCount} hostel{ownerStats.hostelCount !== 1 ? "s" : ""}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-white/50">
                        {new Date(owner.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${owner.status === "inactive" ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}>
                          {owner.status === "inactive" ? "Inactive" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
