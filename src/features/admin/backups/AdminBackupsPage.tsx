"use client";

import { useEffect, useState } from "react";
import { Archive, Download, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

type Backup = {
  id: number;
  triggered_by: string;
  created_at: string;
  size_bytes: number;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminBackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backups");
      if (!res.ok) throw new Error("Failed to load backups");
      const data = (await res.json()) as { backups: Backup[] };
      setBackups(data.backups);
    } catch {
      setError("Could not load backups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const triggerBackup = async () => {
    setTriggering(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      if (!res.ok) throw new Error("Backup failed");
      await load();
    } catch {
      setError("Backup failed. Try again.");
    } finally {
      setTriggering(false);
    }
  };

  const downloadBackup = async (id: number, createdAt: string) => {
    setDownloading(id);
    try {
      const res = await fetch(`/api/admin/backups/${id}`);
      if (!res.ok) throw new Error("Download failed");
      const data = (await res.json()) as { backup: { snapshot: unknown } };
      const blob = new Blob([JSON.stringify(data.backup.snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date(createdAt).toISOString().slice(0, 10)}-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Archive className="h-5 w-5 text-[color:var(--fg-secondary)]" />
            <div>
              <h1 className="text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">Daily backups</h1>
              <p className="text-[11px] text-[color:var(--fg-tertiary)]">Auto-runs at midnight · last 7 days retained</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void triggerBackup()}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2 text-[13px] font-semibold text-[color:var(--fg-primary)] transition hover:bg-[color:var(--surface-strong)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${triggering ? "animate-spin" : ""}`} />
            {triggering ? "Running…" : "Backup Now"}
          </button>
        </div>
      </Card>

      {error && <p className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_30%,transparent)] bg-[color:var(--error-soft)] px-3 py-2 text-sm text-[color:var(--error)]">{error}</p>}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)]">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-[color:var(--fg-tertiary)]">Loading…</div>
        ) : backups.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[color:var(--fg-tertiary)]">No backups yet. First auto-backup runs at midnight.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-[11px] font-semibold uppercase tracking-wider text-[color:var(--fg-tertiary)]">
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Source</th>
                <th className="px-4 py-2.5 text-right">Size</th>
                <th className="px-4 py-2.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[color:var(--fg-primary)]">{fmtDate(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.triggered_by === "manual" ? "bg-[color:var(--brand-soft)] text-[color:var(--accent)]" : "bg-[color:var(--muted)] text-[color:var(--fg-secondary)]"}`}>
                      {b.triggered_by === "manual" ? "Manual" : "Auto"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[color:var(--fg-secondary)]">{fmtSize(b.size_bytes)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" disabled={downloading === b.id} onClick={() => void downloadBackup(b.id, b.created_at)} className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--fg-secondary)] transition hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--fg-primary)] disabled:opacity-40">
                      <Download className="h-3 w-3" />
                      {downloading === b.id ? "…" : "JSON"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
