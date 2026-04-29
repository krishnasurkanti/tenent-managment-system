"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchAdminHostels,
  resetAdminOwnerAccess,
  runAdminHostelAction,
  saveAdminOwnerCredentials,
} from "@/services/admin/admin.service";
import type { AdminHostelRow } from "@/types/admin";

export default function AdminHostelsPage() {
  const [rows, setRows] = useState<AdminHostelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string }>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await fetchAdminHostels();
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
    await runAdminHostelAction(hostelId, action);
    await load();
  };

  const saveCredentials = async (hostelId: string) => {
    const payload = credentials[hostelId];
    if (!payload?.username || !payload?.password) return;
    await saveAdminOwnerCredentials(hostelId, payload.username, payload.password);
    setCredentials((current) => ({
      ...current,
      [hostelId]: { ...current[hostelId], password: "" },
    }));
    await load();
  };

  const resetOwnerLoginAccess = async (hostelId: string) => {
    await resetAdminOwnerAccess(hostelId);
    await load();
  };

  if (loading) {
    return <Card className="p-4 text-sm text-[color:var(--fg-secondary)]">Loading hostels...</Card>;
  }

  return (
    <div className="space-y-4 text-white">
      <Card className="bg-[radial-gradient(circle_at_top_right,rgba(249,193,42,0.14),transparent_28%),linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Admin Control</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Hostel Management</h1>
      </Card>

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.hostelId} className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-3 sm:p-4 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{row.hostelName}</p>
                <p className="text-sm text-[color:var(--fg-secondary)]">{row.address}</p>
                <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">
                  Owner: {row.owner.ownerName} ({row.owner.ownerEmail}) • Hostels: {row.owner.ownerHostelCount} • Tenants: {row.tenantCount}
                </p>
                <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">
                  Login ID: <span className="font-semibold text-white">{row.owner.ownerUsername}</span> • Failed Attempts: <span className="font-semibold text-white">{row.owner.failedLoginAttempts}</span>
                  {row.owner.lockedUntil ? ` • Locked Until: ${new Date(row.owner.lockedUntil).toLocaleString("en-IN")}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={row.status.hostelActive ? "Active" : "Inactive"} tone={row.status.hostelActive ? "green" : "slate"} />
                <StatusPill label={row.owner.ownerSuspended ? "Owner Suspended" : "Owner Active"} tone={row.owner.ownerSuspended ? "rose" : "green"} />
                <StatusPill label={`Plan: ${row.status.planId}`} tone="info" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
                className="rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-white placeholder:text-[color:var(--fg-secondary)]"
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
                className="rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-white placeholder:text-[color:var(--fg-secondary)]"
              />
              <Button onClick={() => saveCredentials(row.hostelId)} className="min-h-12">
                Save Credentials
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "rose" | "info" | "slate" }) {
  const className =
    tone === "green"
      ? "border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]"
      : tone === "rose"
        ? "border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_12px_24px_rgba(220,38,38,0.24)]"
        : tone === "info"
          ? "border-[color:color-mix(in_srgb,var(--info)_40%,transparent)] bg-[color:var(--info-soft)] text-[color:var(--info)]"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-secondary)]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
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
      className={`rounded-[8px] px-3 py-2 text-xs font-semibold ${
        tone === "danger"
          ? "border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_12px_24px_rgba(220,38,38,0.24)]"
          : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-white"
      }`}
    >
      {children}
    </button>
  );
}
