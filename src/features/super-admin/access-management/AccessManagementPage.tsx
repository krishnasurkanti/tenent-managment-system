"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, LogOut, Mail, Plus, ServerCog, Trash2, User, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";

type OwnerRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  status: "active" | "inactive";
  createdAt: string;
  plan: "starter" | "pro" | "founding";
  planStatus: "trial" | "active" | "due_soon" | "overdue";
  trialStartDate: string;
};

type OwnerStats = {
  ownerId: string;
  hostelCount: number;
  hostelNames: string[];
  tenantCount: number;
};

function trialDaysLeft(trialStartDate: string) {
  const start = new Date(trialStartDate);
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function PlanBadge({ owner }: { owner: OwnerRow }) {
  if (owner.plan === "founding") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f7bf53]/15 px-2.5 py-1 text-xs font-semibold text-[#f7bf53]">
        ★ Gold Founder
      </span>
    );
  }

  if (owner.planStatus === "trial") {
    const left = trialDaysLeft(owner.trialStartDate);
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300">
        {left}d Trial
      </span>
    );
  }

  if (owner.planStatus === "due_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
        Due Soon
      </span>
    );
  }

  if (owner.planStatus === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
        Overdue
      </span>
    );
  }

  // active / paid
  const planLabel = owner.plan === "pro" ? "Pro · Paid" : "Starter · Paid";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-400">
      {planLabel}
    </span>
  );
}

export default function AccessManagementPage() {
  return (
    <Suspense>
      <AccessManagementPageInner />
    </Suspense>
  );
}

function AccessManagementPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [stats, setStats] = useState<Record<string, OwnerStats>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersRes, statsRes] = await Promise.all([
        fetch("/api/super-admin/owners"),
        fetch("/api/super-admin/owner-stats"),
      ]);
      const ownersData = (await ownersRes.json()) as { owners?: OwnerRow[] };
      const statsData = (await statsRes.json()) as { stats?: OwnerStats[] };

      setOwners(ownersData.owners ?? []);

      const statsMap: Record<string, OwnerStats> = {};
      for (const s of statsData.stats ?? []) {
        statsMap[s.ownerId] = s;
      }
      setStats(statsMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLogout = async () => {
    await csrfFetch("/api/auth/admin/logout", { method: "POST" });
    router.replace("/super-admin/login");
    router.refresh();
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");

    try {
      const res = await csrfFetch("/api/super-admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        setFormError(data.message ?? "Failed to create owner.");
        return;
      }

      setName(""); setEmail(""); setUsername(""); setPassword("");
      setFormOpen(false);
      await load();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (owner: OwnerRow) => {
    if (togglingId) return;
    setTogglingId(owner.id);
    const nextStatus = owner.status === "active" ? "inactive" : "active";
    try {
      await csrfFetch(`/api/super-admin/owners/${owner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await csrfFetch(`/api/super-admin/owners/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#0f172a] text-white">
      <header className="border-b border-white/10 bg-[#0d1526] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Super Admin</p>
              <p className="text-xs text-white/40">Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setFormOpen(true); setFormError(""); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-4 py-2.5 text-sm font-semibold text-[#1b1207] shadow-[0_14px_28px_rgba(240,175,47,0.24)]"
            >
              <Plus className="h-4 w-4" />
              Add Owner
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/70 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Add Owner Form */}
        {formOpen ? (
          <div className="mb-6 rounded-2xl border border-white/12 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">New Owner Account</h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/60">Full Name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={saving}
                      placeholder="e.g. Raghuveer Reddy"
                      autoComplete="off"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/60">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={saving}
                      placeholder="owner@example.com"
                      autoComplete="off"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/60">Username</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={saving}
                      placeholder="e.g. raghu_pg"
                      autoComplete="off"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/60">Password</span>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={saving}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      aria-label={showNewPassword ? "Hide" : "Show"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>

              {formError ? (
                <p role="alert" className="text-sm text-red-400">{formError}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_100%)] px-5 py-2 text-sm font-semibold text-[#1b1207] disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Owner"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-white/12 px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Summary */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Owner Accounts</h1>
            <p className="mt-0.5 text-sm text-white/40">
              {owners.length} owner{owners.length !== 1 ? "s" : ""} registered. Share credentials offline.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
            <Users className="h-4 w-4 text-[#f7bf53]" />
            <span className="text-sm font-semibold text-white">{owners.length}</span>
            <span className="text-xs text-white/40">owners</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center">
            <Users className="mx-auto h-9 w-9 text-white/20" />
            <p className="mt-3 text-sm font-medium text-white/40">No owner accounts yet.</p>
            <p className="mt-1 text-xs text-white/25">Click Add Owner to create an account and share credentials offline.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Hostels</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Tenants</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => {
                  const ownerStats = stats[owner.id];
                  return (
                    <tr key={owner.id} className="border-t border-white/8 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{owner.name}</td>
                      <td className="px-4 py-3 text-white/60">{owner.email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/80">{owner.username}</td>
                      <td className="px-4 py-3">
                        <PlanBadge owner={owner} />
                      </td>
                      <td className="px-4 py-3">
                        {ownerStats && ownerStats.hostelCount > 0 ? (
                          <div>
                            <span className="text-white">{ownerStats.hostelCount}</span>
                            {ownerStats.hostelNames.length > 0 ? (
                              <p className="mt-0.5 text-[11px] leading-tight text-white/35">
                                {ownerStats.hostelNames.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {ownerStats ? ownerStats.tenantCount : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(owner)}
                          disabled={togglingId === owner.id}
                          className={`inline-flex cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${
                            owner.status === "active"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {togglingId === owner.id ? "..." : owner.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDelete(owner.id)}
                          disabled={deletingId === owner.id}
                          aria-label={`Delete ${owner.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
  );
}
