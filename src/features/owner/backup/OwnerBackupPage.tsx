"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup, Download, HardDriveDownload, Plus, RotateCcw, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OwnerPageHero } from "@/components/ui/owner-page";
import { ownerPanelClass } from "@/components/ui/owner-theme";
import type { BackupMeta, BackupSnapshot } from "@/lib/backup";

type ListResponse = {
  mode: "demo" | "live";
  backups: BackupMeta[];
  message?: string;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function OwnerBackupPage() {
  const [mode, setMode] = useState<"demo" | "live" | null>(null);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/backup");
      const data = (await res.json()) as ListResponse;
      setMode(data.mode);
      setBackups(data.backups ?? []);
    } catch {
      setMessage({ type: "error", text: "Unable to load backups." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBackups();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/owner/backup", { method: "POST" });
      const data = (await res.json()) as { backup?: BackupMeta; message?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Failed to create backup." });
      } else {
        setMessage({ type: "success", text: "Backup created." });
        await loadBackups();
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: string) => {
    setRestoring(true);
    setMessage(null);
    try {
      const dlRes = await fetch(`/api/owner/backup/download?id=${encodeURIComponent(id)}`);
      if (!dlRes.ok) {
        setMessage({ type: "error", text: "Could not fetch backup file." });
        setRestoring(false);
        return;
      }
      const snapshot = (await dlRes.json()) as BackupSnapshot;
      const res = await fetch("/api/owner/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const data = (await res.json()) as { message?: string; tenantCount?: number };
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Restore failed." });
      } else {
        setMessage({ type: "success", text: data.message ?? "Restore complete. Reloading..." });
        await loadBackups();
        window.location.reload();
      }
    } catch {
      setMessage({ type: "error", text: "Network error during restore." });
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
      setRestoreConfirm(false);
    }
  };

  const handleFileRestore = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "Backup file is too large (max 10 MB). Select a valid backup file." });
      return;
    }
    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text) as BackupSnapshot;
      const res = await fetch("/api/owner/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Restore failed." });
      } else {
        setMessage({ type: "success", text: data.message ?? "Restore complete. Reloading..." });
        await loadBackups();
        window.location.reload();
      }
    } catch {
      setMessage({ type: "error", text: "Invalid backup file." });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-3">
      <OwnerPageHero
        eyebrow="Backup & Restore"
        title="Data backup"
        description="Protect your tenant data with automatic daily backups and one-click restore."
        badge={
          <span className="inline-flex rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">
            {loading ? "Loading…" : mode === "live" ? "Cloud mode" : `${backups.length} backups`}
          </span>
        }
      />

      {/* Status message */}
      {message ? (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[color:var(--error)] bg-[color:var(--error-soft)] text-[color:var(--error)]"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      ) : null}

      {/* Download full JSON — works in both modes */}
      <Card className={`p-4 ${ownerPanelClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
              <HardDriveDownload className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Download Full Backup</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">
                Export all tenant data, payment history, and hostel config as a JSON file.
              </p>
            </div>
          </div>
          <a
            href="/api/owner/backup/export"
            download
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-4 text-[13px] font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)] transition hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </a>
        </div>
      </Card>

      {mode === "live" ? (
        <Card className={`p-4 ${ownerPanelClass}`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
              <Shield className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-white">Live mode — cloud database</p>
          </div>
          <p className="text-[12px] text-[color:var(--fg-secondary)]">
            Your data is stored in a managed PostgreSQL database. File-based snapshot backups are only available in demo/self-hosted mode.
            Use the JSON export above to keep a local copy of all your data.
          </p>
          <p className="mt-2 text-[12px] text-[color:var(--fg-secondary)]">
            To restore from a JSON backup in live mode, contact support or use your database&apos;s built-in recovery tools.
          </p>
        </Card>
      ) : (
        <>
          {/* Auto-backup info */}
          <Card className={`p-4 ${ownerPanelClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Automatic daily backups</p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">
                    One backup is created automatically every day. Last {Math.min(backups.filter((b) => b.type === "auto").length, 10)} daily snapshots are kept.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => void handleCreate()}
                disabled={creating}
                loading={creating}
                className="shrink-0 rounded-2xl"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {creating ? "Creating…" : "Backup Now"}
              </Button>
            </div>
          </Card>

          {/* Restore from file */}
          <Card className={`p-4 ${ownerPanelClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
                  <DatabaseBackup className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Restore from file</p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">
                    Upload a previously downloaded JSON backup to restore your data.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileRestore(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="secondary"
                disabled={restoring}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 rounded-2xl border-white/12"
              >
                {restoring ? "Restoring…" : "Choose File"}
              </Button>
            </div>
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
              Restoring will overwrite current tenant data. A safety backup is created automatically before restore.
            </p>
          </Card>

          {/* Backup list */}
          <Card className={`overflow-hidden ${ownerPanelClass}`}>
            <div className="border-b border-[color:var(--border)] px-4 py-2.5">
              <p className="text-[13px] font-semibold text-white">Saved backups</p>
            </div>

            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-[color:var(--fg-secondary)]">Loading…</div>
            ) : backups.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[color:var(--fg-secondary)]">
                No backups yet. Click &ldquo;Backup Now&rdquo; to create one.
              </div>
            ) : (
              <div className="divide-y divide-[color:var(--border)]">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            backup.type === "auto"
                              ? "bg-blue-500/15 text-blue-300"
                              : "bg-purple-500/15 text-purple-300"
                          }`}
                        >
                          {backup.type === "auto" ? "Auto" : "Manual"}
                        </span>
                        <p className="text-[12px] font-medium text-white">{fmtDate(backup.createdAt)}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">
                        {backup.tenantCount} tenants · {fmtSize(backup.sizeBytes)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`/api/owner/backup/download?id=${encodeURIComponent(backup.id)}`}
                        download
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-[11px] font-semibold text-white transition hover:bg-white/[0.1]"
                      >
                        <Download className="h-3 w-3" />
                        Save
                      </a>

                      {restoreTarget === backup.id ? (
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] text-amber-400">Confirm restore?</p>
                          <button
                            type="button"
                            disabled={restoring}
                            onClick={() => void handleRestore(backup.id)}
                            className="inline-flex h-7 items-center rounded-xl bg-red-600/80 px-3 text-[11px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            {restoring ? "…" : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRestoreTarget(null); setRestoreConfirm(false); }}
                            className="inline-flex h-7 items-center rounded-xl border border-white/12 px-3 text-[11px] font-semibold text-white/60"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={restoring}
                          onClick={() => { setRestoreTarget(backup.id); setRestoreConfirm(true); }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
