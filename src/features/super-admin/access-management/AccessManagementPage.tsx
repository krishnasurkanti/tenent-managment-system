"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Check, Copy, LogOut, Plus, ServerCog, Trash2, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";

type OwnerRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: "active" | "inactive";
  createdAt: string;
  plan: "free" | "starter" | "growth" | "pro";
  planStatus: "trial" | "active" | "due_soon" | "overdue";
  trialStartDate: string;
};

type OwnerStats = { ownerId: string; hostelCount: number; hostelNames: string[]; tenantCount: number };

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

const panelCls = "min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-2)] sm:p-4";
const chipCls = "rounded-full bg-[color:var(--muted)] px-2 py-0.5 text-[10px] text-[color:var(--fg-secondary)]";

function trialDaysLeft(trialStartDate: string) {
  const start = new Date(trialStartDate);
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function PlanBadge({ owner }: { owner: OwnerRow }) {
  if (owner.planStatus === "trial") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--accent)]">{trialDaysLeft(owner.trialStartDate)}d Trial</span>;
  }
  if (owner.planStatus === "due_soon") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--warning-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--warning)]">Due Soon</span>;
  }
  if (owner.planStatus === "overdue") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--error-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--error)]">Overdue</span>;
  }
  const planLabel = owner.plan === "pro" ? "Diamond - Paid" : owner.plan === "growth" ? "Gold - Paid" : "Silver - Paid";
  return <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--success)]">{planLabel}</span>;
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
        fetch("/api/admin/billing/upgrade-requests"),
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
      for (const s of statsData.stats ?? []) statsMap[s.ownerId] = s;
      setStats(statsMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    if (requestActionId) return;
    setRequestActionId(requestId);
    try {
      await csrfFetch("/api/admin/billing/upgrade-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action }) });
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

  const handleInvite = async () => {
    if (inviting) return;
    setInviting(true);
    setInviteError("");
    setInviteLink("");
    try {
      const res = await csrfFetch("/api/super-admin/invitations", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = (await res.json()) as { message?: string; token?: string };
      if (!res.ok) {
        setInviteError(data.message ?? "Failed to create invitation.");
        return;
      }
      setInviteLink(`${window.location.origin}/owner/accept-invite?token=${data.token ?? ""}`);
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
    setInviteError("");
    setInviteLink("");
    setCopied(false);
  };

  const handleToggleStatus = async (owner: OwnerRow) => {
    if (togglingId) return;
    setTogglingId(owner.id);
    const nextStatus = owner.status === "active" ? "inactive" : "active";
    try {
      await csrfFetch(`/api/super-admin/owners/${owner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    const owner = owners.find((o) => o.id === id);
    const confirmed = window.confirm(`Delete owner "${owner?.name ?? owner?.email ?? id}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await csrfFetch(`/api/super-admin/owners/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  const statusPill = (owner: OwnerRow) => (
    <button
      type="button"
      onClick={() => void handleToggleStatus(owner)}
      disabled={togglingId === owner.id}
      className={`inline-flex cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${owner.status === "active" ? "bg-[color:var(--success-soft)] text-[color:var(--success)]" : "bg-[color:var(--error-soft)] text-[color:var(--error)]"}`}
    >
      {togglingId === owner.id ? "…" : owner.status === "active" ? "Active" : "Inactive"}
    </button>
  );

  const deleteBtn = (owner: OwnerRow, size = "h-8 w-8") => (
    <button type="button" onClick={() => void handleDelete(owner.id)} disabled={deletingId === owner.id} aria-label={`Delete ${owner.name}`} className={`inline-flex ${size} items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--fg-tertiary)] transition hover:bg-[color:var(--error-soft)] hover:text-[color:var(--error)] disabled:opacity-50`}>
      <Trash2 className="h-4 w-4" />
    </button>
  );

  const copyBtn = (active: boolean, onClick: () => void, label: string) => (
    <button type="button" onClick={onClick} aria-label={label} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold transition sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5 ${active ? "bg-[color:var(--success-soft)] text-[color:var(--success)]" : "bg-[color:var(--muted)] text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]"}`}>
      {active ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{active ? "Copied" : "Copy"}</span>
    </button>
  );

  return (
    <div className="nestiq-grid-bg min-h-dvh w-full max-w-full bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      <header className="sticky top-0 z-10 max-w-full border-b border-[color:var(--border)] bg-[color:var(--bg-primary)]/95 px-3 py-2 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
              <ServerCog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-[color:var(--fg-primary)]">Super Admin</p>
              <p className="text-xs text-[color:var(--fg-tertiary)]">Access management</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => router.push("/super-admin/dashboard")} className="hidden items-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm font-medium text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)] sm:inline-flex">
              Dashboard
            </button>
            <button type="button" onClick={() => { setFormOpen(true); setInviteError(""); setInviteLink(""); }} aria-label="Invite Owner" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] text-sm font-semibold text-white shadow-[var(--shadow-brand)] sm:w-auto sm:gap-1.5 sm:px-3">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite Owner</span>
            </button>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-2 text-sm font-medium text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 px-3 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        {/* Invite form */}
        {formOpen ? (
          <div className={panelCls}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-[color:var(--fg-primary)]">Invite owner</h2>
                <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">Generate a one-time link. The owner fills in their own details when they open it.</p>
              </div>
              <button type="button" onClick={handleCloseForm} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]" aria-label="Close form">
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteLink ? (
              <div className="flex flex-col gap-3">
                <div className="min-w-0 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color:var(--success-soft)] px-3 py-3 sm:px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--success)]">Invitation created</p>
                  <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">Copy this link and send it to the owner. It expires in 48 hours.</p>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5">
                  <p className="flex-1 truncate font-mono text-xs text-[color:var(--fg-secondary)]">{inviteLink}</p>
                  {copyBtn(copied, handleCopyLink, copied ? "Invitation link copied" : "Copy invitation link")}
                </div>
                <button type="button" onClick={handleCloseForm} className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] py-2 text-sm font-medium text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">Done</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {inviteError ? <p role="alert" className="text-sm text-[color:var(--error)]">{inviteError}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" disabled={inviting} onClick={() => void handleInvite()} className="rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {inviting ? "Generating…" : "Generate Invite Link"}
                  </button>
                  <button type="button" onClick={handleCloseForm} className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Summary */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="font-display truncate text-xl font-semibold text-[color:var(--fg-primary)]">Owner accounts</h1>
            <p className="mt-0.5 truncate text-sm text-[color:var(--fg-secondary)]">{owners.length} owner{owners.length !== 1 ? "s" : ""} registered.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-2.5">
            <Users className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
            <span className="text-sm font-semibold text-[color:var(--fg-primary)]">{owners.length}</span>
            <span className="hidden text-xs text-[color:var(--fg-tertiary)] sm:inline">owners</span>
          </div>
        </div>

        {/* Owner list */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />)}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-12 text-center">
            <Users className="mx-auto h-9 w-9 text-[color:var(--fg-tertiary)]" />
            <p className="mt-3 text-sm font-medium text-[color:var(--fg-secondary)]">No owner accounts yet.</p>
            <p className="mt-1 text-xs text-[color:var(--fg-tertiary)]">Click Invite Owner to add one.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-2 sm:hidden">
              {owners.map((owner) => {
                const ownerStats = stats[owner.id];
                return (
                  <div key={owner.id} className="min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[color:var(--fg-primary)]">{owner.name || "—"}</p>
                        <p className="truncate text-xs text-[color:var(--fg-secondary)]">{owner.email}</p>
                        <p className="font-mono text-[11px] text-[color:var(--fg-tertiary)]">{owner.phoneNumber || "—"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {statusPill(owner)}
                        {deleteBtn(owner, "h-7 w-7")}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <PlanBadge owner={owner} />
                      {ownerStats ? (
                        <>
                          <span className={chipCls}>{ownerStats.hostelCount} hostel{ownerStats.hostelCount !== 1 ? "s" : ""}</span>
                          <span className={chipCls}>{ownerStats.tenantCount} tenants</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] sm:block">
              <table className="min-w-[520px] text-sm">
                <thead className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)]">
                  <tr>
                    {["Name", "Email", "Phone", "Plan", "Hostels", "Tenants", "Status", "Actions"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-tertiary)] ${i === 7 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => {
                    const ownerStats = stats[owner.id];
                    return (
                      <tr key={owner.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--surface-soft)]">
                        <td className="px-4 py-3 font-medium text-[color:var(--fg-primary)]">{owner.name}</td>
                        <td className="px-4 py-3 text-[color:var(--fg-secondary)]">{owner.email}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[color:var(--fg-secondary)]">{owner.phoneNumber || "—"}</td>
                        <td className="px-4 py-3"><PlanBadge owner={owner} /></td>
                        <td className="px-4 py-3">
                          {ownerStats && ownerStats.hostelCount > 0 ? (
                            <div>
                              <span className="text-[color:var(--fg-primary)]">{ownerStats.hostelCount}</span>
                              {ownerStats.hostelNames.length > 0 ? <p className="mt-0.5 text-[11px] leading-tight text-[color:var(--fg-tertiary)]">{ownerStats.hostelNames.join(", ")}</p> : null}
                            </div>
                          ) : <span className="text-[color:var(--fg-tertiary)]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--fg-primary)]">{ownerStats ? ownerStats.tenantCount : <span className="text-[color:var(--fg-tertiary)]">—</span>}</td>
                        <td className="px-4 py-3">{statusPill(owner)}</td>
                        <td className="px-4 py-3 text-right">{deleteBtn(owner)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Signup link */}
        <div className={panelCls}>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <Plus className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
              <h2 className="truncate font-display text-base font-semibold text-[color:var(--fg-primary)]">Owner signup link</h2>
            </div>
            <button type="button" onClick={handleGenerateKey} disabled={generatingKey} aria-label={signupKey ? "Generate new signup link" : "Generate signup link"} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-xs font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)] disabled:opacity-50 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5">
              <Plus className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">{generatingKey ? "Generating…" : signupKey ? "New Link" : "Generate Link"}</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">One-time link. Expires after one successful registration. Generate a new one each time.</p>

          {signupKey ? (
            <div className="mt-3 flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5">
              <p className="flex-1 truncate font-mono text-xs text-[color:var(--fg-secondary)]">{`${typeof window !== "undefined" ? window.location.origin : ""}/owner/signup?key=${signupKey}`}</p>
              {copyBtn(signupKeyCopied, handleCopySignupLink, signupKeyCopied ? "Signup link copied" : "Copy signup link")}
            </div>
          ) : (
            <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--fg-tertiary)]">
              No active link. Click &quot;Generate Link&quot; to create one.
            </div>
          )}
        </div>

        {/* Plan change requests */}
        <div className={panelCls}>
          <div className="flex min-w-0 items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
            <h2 className="min-w-0 font-display text-base font-semibold text-[color:var(--fg-primary)]">Plan change requests</h2>
          </div>
          <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">Owners wait here for super-admin approval before upgrades or downgrades take effect.</p>

          <div className="mt-4 flex flex-col gap-2">
            {upgradeRequests.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4 text-sm text-[color:var(--fg-secondary)]">No plan requests right now.</div>
            ) : (
              upgradeRequests.map((request) => (
                <div key={request.requestId} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--fg-primary)]">{request.hostelName}: {request.currentPlanId.toUpperCase()} {"->"} {request.requestedPlanId.toUpperCase()}</p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{request.note || "Owner requested a plan change."} • {request.status} • {new Date(request.requestedAt).toLocaleString()}</p>
                  </div>
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={requestActionId === request.requestId} onClick={() => void handleRequestAction(request.requestId, "approve")} className="rounded-[var(--radius-md)] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Approve</button>
                      <button type="button" disabled={requestActionId === request.requestId} onClick={() => void handleRequestAction(request.requestId, "reject")} className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_30%,transparent)] bg-[color:var(--error-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--error)] disabled:opacity-60">Reject</button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold text-[color:var(--fg-secondary)]">{request.status}</span>
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
