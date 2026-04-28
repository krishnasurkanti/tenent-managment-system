"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Check, Copy, LogOut, Mail, Phone, Plus, ServerCog, Trash2, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";

type OwnerRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePgName, setInvitePgName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);
  const [signupKey, setSignupKey] = useState<string | null>(null);
  const [signupKeyCopied, setSignupKeyCopied] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersRes, statsRes, requestsRes, keyRes] = await Promise.all([
        fetch("/api/super-admin/owners"),
        fetch("/api/super-admin/owner-stats"),
        fetch("/api/super-admin/upgrade-requests"),
        fetch("/api/super-admin/signup-key"),
      ]);
      const ownersData = (await ownersRes.json()) as { owners?: OwnerRow[] };
      const statsData = (await statsRes.json()) as { stats?: OwnerStats[] };
      const requestData = (await requestsRes.json()) as { requests?: UpgradeRequest[] };
      const keyData = (await keyRes.json()) as { key?: string | null };

      setOwners(ownersData.owners ?? []);
      setUpgradeRequests(requestData.requests ?? []);
      setSignupKey(keyData.key ?? null);

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

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setInviteError("");
    setInviteLink("");

    try {
      const res = await csrfFetch("/api/super-admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), pgName: invitePgName.trim() }),
      });
      const data = (await res.json()) as { message?: string; token?: string };

      if (!res.ok) {
        setInviteError(data.message ?? "Failed to create invitation.");
        return;
      }

      const link = `${window.location.origin}/owner/accept-invite?token=${data.token ?? ""}`;
      setInviteLink(link);
    } catch {
      setInviteError("Network error. Try again.");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateKey = async () => {
    if (generatingKey) return;
    setGeneratingKey(true);
    try {
      const res = await csrfFetch("/api/super-admin/signup-key", { method: "POST" });
      const data = (await res.json()) as { key?: string };
      if (res.ok && data.key) setSignupKey(data.key);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopySignupLink = async () => {
    if (!signupKey) return;
    await navigator.clipboard.writeText(`${window.location.origin}/owner/signup?key=${signupKey}`);
    setSignupKeyCopied(true);
    setTimeout(() => setSignupKeyCopied(false), 2000);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setInviteEmail("");
    setInvitePgName("");
    setInviteError("");
    setInviteLink("");
    setCopied(false);
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
    const owner = owners.find((o) => o.id === id);
    const confirmed = window.confirm(
      `Delete owner "${owner?.name ?? owner?.email ?? id}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await csrfFetch(`/api/super-admin/owners/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-dvh w-full max-w-full overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#09090b_0%,#111114_100%)] text-white">
      <header className="border-b border-white/10 bg-[rgba(9,9,11,0.88)] px-4 py-2 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#fcd34d_0%,#f59e0b_100%)] text-[#18120a] shadow-[0_16px_34px_rgba(245,158,11,0.25)]">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-white">Super Admin</p>
              <p className="text-xs text-white/40">Access management</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push("/super-admin/dashboard")}
              className="hidden items-center rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/70 hover:text-white sm:inline-flex"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(true); setInviteError(""); setInviteLink(""); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#f59e0b_0%,#fcd34d_100%)] px-3 py-2 text-sm font-semibold text-[#1b1207] shadow-[0_14px_28px_rgba(240,175,47,0.24)]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite Owner</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2 text-sm font-medium text-white/70 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        {/* Add Owner Form */}
        {formOpen ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-white">Invite Owner</h2>
                <p className="mt-1 text-xs text-white/45">Enter their email. They click the link and set their own password — no credential sharing needed.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteLink ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#4ade80]/20 bg-[#22c55e]/[0.07] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4ade80]">Invitation created</p>
                  <p className="mt-1 text-xs text-white/60">Copy this link and send it to the owner via WhatsApp or any other channel. It expires in 48 hours.</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5">
                  <p className="flex-1 truncate font-mono text-xs text-white/70">{inviteLink}</p>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${copied ? "bg-[#22c55e]/20 text-[#4ade80]" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"}`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="w-full rounded-xl border border-white/12 py-2 text-sm font-medium text-white/60 hover:text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Owner Email</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={inviting}
                        placeholder="owner@example.com"
                        autoComplete="off"
                        required
                        className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      PG / Hostel Name <span className="normal-case font-normal text-white/30">(optional)</span>
                    </span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={invitePgName}
                        onChange={(e) => setInvitePgName(e.target.value)}
                        disabled={inviting}
                        placeholder="e.g. Sai Krishna PG"
                        autoComplete="off"
                        className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                      />
                    </div>
                  </label>
                </div>

                {inviteError ? (
                  <p role="alert" className="text-sm text-red-400">{inviteError}</p>
                ) : null}

                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_100%)] px-5 py-2 text-sm font-semibold text-[#1b1207] disabled:opacity-60"
                  >
                    {inviting ? "Generating…" : "Generate Invite Link"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="rounded-xl border border-white/12 px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}

        {/* Summary */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white">Owner Accounts</h1>
            <p className="mt-0.5 text-sm text-white/40">
              {owners.length} owner{owners.length !== 1 ? "s" : ""} registered.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 sm:px-4 sm:py-2.5">
            <Users className="h-4 w-4 text-[#f7bf53]" />
            <span className="text-sm font-semibold text-white">{owners.length}</span>
            <span className="text-xs text-white/40">owners</span>
          </div>
        </div>

        {/* Owner list — shown first so it's immediately visible */}
        <div className="mb-4">
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
            <p className="mt-1 text-xs text-white/25">Click Invite Owner to add one.</p>
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
                        <p className="font-mono text-[11px] text-white/40">{owner.phoneNumber || "—"}</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Phone</th>
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
                        <td className="px-4 py-3 font-mono text-xs text-white/80">{owner.phoneNumber || "—"}</td>
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
        </div>

        {/* Signup Link */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Plus className="h-4 w-4 text-[#f7bf53]" />
              <h2 className="font-display text-base font-semibold text-white">Owner signup link</h2>
            </div>
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={generatingKey}
              className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50"
            >
              {generatingKey ? "Generating…" : signupKey ? "New Link" : "Generate Link"}
            </button>
          </div>
          <p className="mt-1 text-xs text-white/45">One-time link. Expires after one successful registration. Generate a new one each time.</p>

          {signupKey ? (
            <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5">
              <p className="flex-1 truncate font-mono text-xs text-white/70">{`${typeof window !== "undefined" ? window.location.origin : ""}/owner/signup?key=${signupKey}`}</p>
              <button
                type="button"
                onClick={handleCopySignupLink}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${signupKeyCopied ? "bg-[#22c55e]/20 text-[#4ade80]" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"}`}
              >
                {signupKeyCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {signupKeyCopied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/40">
              No active link. Click &quot;Generate Link&quot; to create one.
            </div>
          )}
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
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

      </main>
    </div>
  );
}
