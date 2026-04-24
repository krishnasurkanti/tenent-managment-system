"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Eye, EyeOff, LogOut, Mail, Plus, ServerCog, Trash2, User, Users, X } from "lucide-react";
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

type UpgradeRequest = {
  requestId: string;
  hostelId: string;
  hostelName: string;
  currentPlanId: string;
  requestedPlanId: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
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
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersRes, statsRes, requestsRes] = await Promise.all([
        fetch("/api/super-admin/owners"),
        fetch("/api/super-admin/owner-stats"),
        fetch("/api/super-admin/upgrade-requests"),
      ]);
      const ownersData = (await ownersRes.json()) as { owners?: OwnerRow[] };
      const statsData = (await statsRes.json()) as { stats?: OwnerStats[] };
      const requestData = (await requestsRes.json()) as { requests?: UpgradeRequest[] };

      setOwners(ownersData.owners ?? []);
      setUpgradeRequests(requestData.requests ?? []);

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

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    if (requestActionId) return;
    setRequestActionId(requestId);
    try {
      await csrfFetch("/api/super-admin/upgrade-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      await load();
    } finally {
      setRequestActionId(null);
    }
  };

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
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#09090b_0%,#111114_100%)] text-white">
      <header className="border-b border-white/10 bg-[rgba(9,9,11,0.88)] px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#fcd34d_0%,#f59e0b_100%)] text-[#18120a] shadow-[0_16px_34px_rgba(245,158,11,0.25)]">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-white">Super Admin</p>
              <p className="text-xs text-white/40">Access management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setFormOpen(true); setFormError(""); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#f59e0b_0%,#fcd34d_100%)] px-3 py-2 text-sm font-semibold text-[#1b1207] shadow-[0_14px_28px_rgba(240,175,47,0.24)] sm:px-4 sm:py-2.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Add Owner</span>
              <span className="xs:hidden sm:hidden">Add</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/70 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Add Owner Form */}
        {formOpen ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-white">New Owner Account</h2>
                <p className="mt-1 text-xs text-white/45">Create access here, then share credentials manually with the owner.</p>
              </div>
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
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Full Name</span>
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
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Email</span>
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
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Username</span>
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
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Password</span>
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

        <div className="mb-6 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-[#f7bf53]" />
            <h2 className="font-display text-base font-semibold text-white">Plan change requests</h2>
          </div>
          <p className="mt-1 text-xs text-white/45">Owners wait here for super-admin approval before upgrades or downgrades take effect.</p>

          <div className="mt-4 space-y-2">
            {upgradeRequests.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/45">
                No plan requests right now.
              </div>
            ) : (
              upgradeRequests.map((request) => (
                <div key={request.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {request.hostelName}: {request.currentPlanId.toUpperCase()} {"->"} {request.requestedPlanId.toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {request.note || "Owner requested a plan change."} • {request.status} • {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={requestActionId === request.requestId}
                        onClick={() => void handleRequestAction(request.requestId, "approve")}
                        className="rounded-xl bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={requestActionId === request.requestId}
                        onClick={() => void handleRequestAction(request.requestId, "reject")}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/60">
                      {request.status}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Owner list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center">
            <Users className="mx-auto h-9 w-9 text-white/20" />
            <p className="mt-3 text-sm font-medium text-white/40">No owner accounts yet.</p>
            <p className="mt-1 text-xs text-white/25">Click Add Owner to create one.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-2 sm:hidden">
              {owners.map((owner) => {
                const ownerStats = stats[owner.id];
                return (
                  <div key={owner.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{owner.name || "—"}</p>
                        <p className="truncate text-xs text-white/50">{owner.email}</p>
                        <p className="font-mono text-[11px] text-white/40">@{owner.username}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(owner)}
                          disabled={togglingId === owner.id}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${owner.status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}
                        >
                          {togglingId === owner.id ? "..." : owner.status === "active" ? "Active" : "Inactive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(owner.id)}
                          disabled={deletingId === owner.id}
                          aria-label={`Delete ${owner.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <PlanBadge owner={owner} />
                      {ownerStats ? (
                        <>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">{ownerStats.hostelCount} hostel{ownerStats.hostelCount !== 1 ? "s" : ""}</span>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">{ownerStats.tenantCount} tenants</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-white/10 sm:block">
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
                        <td className="px-4 py-3"><PlanBadge owner={owner} /></td>
                        <td className="px-4 py-3">
                          {ownerStats && ownerStats.hostelCount > 0 ? (
                            <div>
                              <span className="text-white">{ownerStats.hostelCount}</span>
                              {ownerStats.hostelNames.length > 0 ? (
                                <p className="mt-0.5 text-[11px] leading-tight text-white/35">{ownerStats.hostelNames.join(", ")}</p>
                              ) : null}
                            </div>
                          ) : <span className="text-white/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-white">
                          {ownerStats ? ownerStats.tenantCount : <span className="text-white/30">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(owner)}
                            disabled={togglingId === owner.id}
                            className={`inline-flex cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${owner.status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}
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
          </>
        )}
      </main>
    </div>
  );
}
