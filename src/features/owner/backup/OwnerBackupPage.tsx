"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup, Download, HardDriveDownload, Plus, RotateCcw, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
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
      if (!res.ok) setMessage({ type: "error", text: data.message ?? "Failed to create backup." });
      else {
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
      if (!res.ok) setMessage({ type: "error", text: data.message ?? "Restore failed." });
      else {
        setMessage({ type: "success", text: data.message ?? "Restore complete. Reloading..." });
        await loadBackups();
        window.location.reload();
      }
    } catch {
      setMessage({ type: "error", text: "Network error during restore." });
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
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
      if (!res.ok) setMessage({ type: "error", text: data.message ?? "Restore failed." });
      else {
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
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Backup &amp; restore</p>
          <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Data backup</h1>
          <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Automatic daily backups and one-click restore.</p>
        </div>
        <span className="mt-1 shrink-0 rounded-full border border-[color:color-mix(in_srgb,var(--brand)_35%,transparent)] bg-[color:var(--brand-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--accent)]">
          {loading ? "Loading…" : mode === "live" ? "Cloud mode" : `${backups.length} backups`}
        </span>
      </header>

      {message ? (
        <div className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium ${
          message.type === "success"
            ? "border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)]"
            : "border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] text-[color:var(--error)]"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      ) : null}

      {/* Download full JSON */}
      <ActionCard
        icon={<HardDriveDownload size={16} />}
        title="Download full backup"
        desc="Export all tenant data, payment history, and hostel config as a JSON file."
        action={
          <a href="/api/owner/backup/export" download className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-brand)] hover:brightness-110">
            <Download size={16} /> Download JSON
          </a>
        }
      />

      {mode === "live" ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]"><Shield size={16} /></span>
            <p className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">Live mode — cloud database</p>
          </div>
          <p className="text-[12px] text-[color:var(--fg-secondary)]">
            Your data is stored in a managed PostgreSQL database. File-based snapshot backups are only available in demo/self-hosted mode. Use the JSON export above to keep a local copy.
          </p>
          <p className="mt-2 text-[12px] text-[color:var(--fg-secondary)]">
            To restore from a JSON backup in live mode, contact support or use your database&apos;s built-in recovery tools.
          </p>
        </Card>
      ) : (
        <>
          <ActionCard
            icon={<Clock size={16} />}
            title="Automatic daily backups"
            desc={`One backup is created automatically every day. Last ${Math.min(backups.filter((b) => b.type === "auto").length, 10)} daily snapshots are kept.`}
            action={<Button onClick={() => void handleCreate()} disabled={creating} loading={creating} className="shrink-0"><Plus size={14} /> {creating ? "Creating…" : "Backup Now"}</Button>}
          />

          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]"><DatabaseBackup size={16} /></span>
                <div>
                  <p className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">Restore from file</p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">Upload a previously downloaded JSON backup to restore your data.</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileRestore(f); e.target.value = ""; }} />
              <Button variant="secondary" disabled={restoring} onClick={() => fileInputRef.current?.click()} className="shrink-0">
                {restoring ? "Restoring…" : "Choose File"}
              </Button>
            </div>
            <p className="mt-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color:var(--warning-soft)] px-3 py-2 text-[11px] text-[color:var(--warning)]">
              Restoring will overwrite current tenant data. A safety backup is created automatically before restore.
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-4 py-2.5">
              <p className="text-[13px] font-semibold text-[color:var(--fg-primary)]">Saved backups</p>
            </div>
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-[color:var(--fg-secondary)]">Loading…</div>
            ) : backups.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[color:var(--fg-secondary)]">No backups yet. Click &ldquo;Backup Now&rdquo; to create one.</div>
            ) : (
              <div className="divide-y divide-[color:var(--border)]">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${backup.type === "auto" ? "bg-[color:var(--brand-soft)] text-[color:var(--accent)]" : "bg-[color:var(--muted)] text-[color:var(--fg-secondary)]"}`}>
                          {backup.type === "auto" ? "Auto" : "Manual"}
                        </span>
                        <p className="text-[12px] font-medium text-[color:var(--fg-primary)]">{fmtDate(backup.createdAt)}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{backup.tenantCount} tenants · {fmtSize(backup.sizeBytes)}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <a href={`/api/owner/backup/download?id=${encodeURIComponent(backup.id)}`} download className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-[11px] font-semibold text-[color:var(--fg-primary)] hover:bg-[color:var(--surface-strong)]">
                        <Download size={12} /> Save
                      </a>

                      {restoreTarget === backup.id ? (
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] text-[color:var(--warning)]">Confirm restore?</p>
                          <button type="button" disabled={restoring} onClick={() => void handleRestore(backup.id)} className="inline-flex h-7 items-center rounded-[var(--radius-md)] bg-[color:var(--error)] px-3 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-50">
                            {restoring ? "…" : "Yes"}
                          </button>
                          <button type="button" onClick={() => setRestoreTarget(null)} className="inline-flex h-7 items-center rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 text-[11px] font-semibold text-[color:var(--fg-secondary)]">
                            No
                          </button>
                        </div>
                      ) : (
                        <button type="button" disabled={restoring} onClick={() => setRestoreTarget(backup.id)} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color:var(--warning-soft)] px-3 text-[11px] font-semibold text-[color:var(--warning)] hover:brightness-110 disabled:opacity-50">
                          <RotateCcw size={12} /> Restore
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

function ActionCard({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">{icon}</span>
          <div>
            <p className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">{title}</p>
            <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{desc}</p>
          </div>
        </div>
        {action}
      </div>
    </Card>
  );
}
