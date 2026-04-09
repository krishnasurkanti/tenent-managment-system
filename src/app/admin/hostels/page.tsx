"use client";

import { useEffect, useState } from "react";

type HostelRow = {
  hostelId: string;
  hostelName: string;
  address: string;
  tenantCount: number;
  owner: {
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    ownerUsername: string;
    failedLoginAttempts: number;
    lockedUntil: string | null;
    ownerSuspended: boolean;
    ownerHostelCount: number;
  };
  status: {
    hostelActive: boolean;
    planId: string;
  };
};

export default function AdminHostelsPage() {
  const [rows, setRows] = useState<HostelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string }>>({});

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/admin/hostels", { cache: "no-store" });
    const data = (await response.json()) as { hostels: HostelRow[] };
    setRows(data.hostels ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setCredentials((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (!next[row.hostelId]) {
          next[row.hostelId] = { username: row.owner.ownerUsername, password: "" };
        }
      }
      return next;
    });
  }, [rows]);

  const runAction = async (hostelId: string, action: string) => {
    await fetch(`/api/admin/hostels/${hostelId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  };

  const saveCredentials = async (hostelId: string) => {
    const payload = credentials[hostelId];
    if (!payload?.username || !payload?.password) return;
    await fetch("/api/admin/owner-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId, username: payload.username, password: payload.password }),
    });
    setCredentials((current) => ({
      ...current,
      [hostelId]: { ...current[hostelId], password: "" },
    }));
    await load();
  };

  const resetOwnerLoginAccess = async (hostelId: string) => {
    await fetch("/api/admin/owner-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId }),
    });
    await load();
  };

  if (loading) return <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600">Loading hostels...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Admin Control</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Hostel Management</h1>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.hostelId} className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{row.hostelName}</p>
                <p className="text-sm text-slate-500">{row.address}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Owner: {row.owner.ownerName} ({row.owner.ownerEmail}) • Hostels: {row.owner.ownerHostelCount} • Tenants: {row.tenantCount}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Login ID: <span className="font-semibold">{row.owner.ownerUsername}</span> • Failed Attempts:{" "}
                  <span className="font-semibold">{row.owner.failedLoginAttempts}</span>
                  {row.owner.lockedUntil ? ` • Locked Until: ${new Date(row.owner.lockedUntil).toLocaleString("en-IN")}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={row.status.hostelActive ? "Active" : "Inactive"} tone={row.status.hostelActive ? "green" : "slate"} />
                <StatusPill label={row.owner.ownerSuspended ? "Owner Suspended" : "Owner Active"} tone={row.owner.ownerSuspended ? "rose" : "green"} />
                <StatusPill label={`Plan: ${row.status.planId}`} tone="sky" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton onClick={() => runAction(row.hostelId, row.status.hostelActive ? "deactivate" : "activate")}>
                {row.status.hostelActive ? "Deactivate Hostel" : "Activate Hostel"}
              </ActionButton>
              <ActionButton onClick={() => runAction(row.hostelId, row.owner.ownerSuspended ? "unsuspend_owner" : "suspend_owner")}>
                {row.owner.ownerSuspended ? "Unsuspend Owner" : "Suspend Owner"}
              </ActionButton>
              <ActionButton onClick={() => runAction(row.hostelId, "reset_owner_password")}>Reset Owner Password</ActionButton>
              <ActionButton onClick={() => resetOwnerLoginAccess(row.hostelId)}>Reset Failed Attempts</ActionButton>
              <ActionButton tone="danger" onClick={() => runAction(row.hostelId, "delete_hostel")}>
                Delete Hostel
              </ActionButton>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={credentials[row.hostelId]?.username ?? row.owner.ownerUsername}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    [row.hostelId]: {
                      username: event.target.value,
                      password: current[row.hostelId]?.password ?? "",
                    },
                  }))
                }
                placeholder="Owner username"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                type="password"
                value={credentials[row.hostelId]?.password ?? ""}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    [row.hostelId]: {
                      username: current[row.hostelId]?.username ?? row.owner.ownerUsername,
                      password: event.target.value,
                    },
                  }))
                }
                placeholder="New owner password"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <button
                type="button"
                onClick={() => saveCredentials(row.hostelId)}
                className="rounded-xl bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)] px-3 py-2 text-xs font-semibold text-white"
              >
                Save Credentials
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "rose" | "sky" | "slate" }) {
  const className =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-100 text-rose-700"
        : tone === "sky"
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function ActionButton({
  children,
  tone = "normal",
  onClick,
}: {
  children: React.ReactNode;
  tone?: "normal" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-semibold ${tone === "danger" ? "bg-rose-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
    >
      {children}
    </button>
  );
}
