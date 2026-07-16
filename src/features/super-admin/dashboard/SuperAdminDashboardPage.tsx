"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LogOut, Plus, ServerCog, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonBlock } from "@/components/ui/skeleton";
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
  if (tenantCount > 150) return "Diamond";
  if (tenantCount > 50) return "Gold";
  if (tenantCount > 25) return "Silver";
  return "Free Trial";
}

function planClass(label: string) {
  return label === "Diamond" || label === "Gold"
    ? "bg-[color:var(--brand-soft)] text-[color:var(--accent)]"
    : "bg-[color:var(--muted)] text-[color:var(--fg-secondary)]";
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

  const columns = useMemo<Column<OwnerRow>[]>(() => [
    { key: "name", header: "Name", render: (o) => <span className="font-medium text-[color:var(--fg-primary)]">{o.name}</span> },
    { key: "username", header: "Username", render: (o) => <span className="font-mono text-xs text-[color:var(--fg-secondary)]">{o.username}</span> },
    {
      key: "plan",
      header: "Plan",
      render: (o) => {
        const label = getPlanLabel(stats[o.id]?.tenantCount ?? 0);
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${planClass(label)}`}>{label}</span>;
      },
    },
    {
      key: "tenants",
      header: "Active Tenants",
      render: (o) => {
        const s = stats[o.id];
        return (
          <span>
            <span className="text-[color:var(--fg-primary)]">{s?.tenantCount ?? 0}</span>
            {s?.hostelCount ? <span className="ml-1.5 text-xs text-[color:var(--fg-tertiary)]">{s.hostelCount} hostel{s.hostelCount !== 1 ? "s" : ""}</span> : null}
          </span>
        );
      },
    },
    { key: "created", header: "Created", render: (o) => <span className="text-[color:var(--fg-secondary)]">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span> },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${o.status === "inactive" ? "bg-[color:var(--error-soft)] text-[color:var(--error)]" : "bg-[color:var(--success-soft)] text-[color:var(--success)]"}`}>
          {o.status === "inactive" ? "Inactive" : "Active"}
        </span>
      ),
    },
  ], [stats]);

  return (
    <div className="nestiq-grid-bg min-h-dvh w-full max-w-full bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      <header className="sticky top-0 z-10 max-w-full border-b border-[color:var(--border)] bg-[color:var(--bg-primary)]/95 px-3 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
              <ServerCog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[color:var(--fg-primary)]">Super Admin</p>
              <p className="text-xs text-[color:var(--fg-tertiary)]">Control Panel</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-sm font-medium text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)] sm:w-auto sm:gap-2 sm:px-3">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-5xl px-3 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => router.push("/super-admin/access-management")} className="flex min-w-0 items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-4 text-left transition hover:border-[color:var(--border-strong)]">
            <div className="flex min-w-0 items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[color:var(--accent)]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--fg-primary)]">Access Management</p>
                <p className="text-xs text-[color:var(--fg-tertiary)]">Manage owner accounts &amp; credentials</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
          </button>

          <div className="flex min-w-0 items-center justify-between rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-[color:var(--accent)]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--fg-primary)]">{owners.length} Owner{owners.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-[color:var(--fg-tertiary)]">Registered on platform</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="font-display truncate text-xl font-semibold text-[color:var(--fg-primary)]">Owner accounts</h1>
            <p className="mt-0.5 truncate text-sm text-[color:var(--fg-secondary)]">{owners.length} owner{owners.length !== 1 ? "s" : ""} registered. Share credentials offline.</p>
          </div>
          <button type="button" onClick={() => router.push("/super-admin/access-management?new=1")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] text-sm font-semibold text-white shadow-[var(--shadow-brand)] sm:w-auto sm:gap-2 sm:px-4">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Owner</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-14 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface-soft)]">
            <EmptyState icon={<Users size={28} />} title="No owner accounts yet" description="Click Add Owner to create an account." />
          </div>
        ) : (
          <DataTable columns={columns} rows={owners} getRowKey={(o) => o.id} />
        )}
      </main>
    </div>
  );
}
