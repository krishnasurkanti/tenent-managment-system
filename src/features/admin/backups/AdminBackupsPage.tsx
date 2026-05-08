"use client";

import { useEffect, useState } from "react";
import { Archive, Download, RefreshCw } from "lucide-react";

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
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  useEffect(() => {
    void load();
  }, []);

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
      const blob = new Blob([JSON.stringify(data.backup.snapshot, null, 2)], {
        type: "application/json",
      });
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
    <div className="space-y-4">
      <div className="rounded-[10px] border border-white/10 bg-white/[0.04] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Archive className="h-5 w-5 text-white/50" />
            <div>
              <h1 className="text-lg font-semibold text-white">Daily Backups</h1>
              <p className="text-[11px] text-white/40">
                Auto-runs at midnight · last 7 days retained
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void triggerBackup()}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${triggering ? "animate-spin" : ""}`} />
            {triggering ? "Running…" : "Backup Now"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-white/40">Loading…</div>
        ) : backups.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-white/40">
            No backups yet. First auto-backup runs at midnight.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Source</th>
                <th className="px-4 py-2.5 text-right">Size</th>
                <th className="px-4 py-2.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr
                  key={b.id}
                  className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                >
                  <td className="px-4 py-3 font-medium text-white">{fmtDate(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        b.triggered_by === "manual"
                          ? "bg-[rgba(99,102,241,0.2)] text-[#a5b4fc]"
                          : "bg-white/8 text-white/45"
                      }`}
                    >
                      {b.triggered_by === "manual" ? "Manual" : "Auto"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/55">{fmtSize(b.size_bytes)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={downloading === b.id}
                      onClick={() => void downloadBackup(b.id, b.created_at)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-40"
                    >
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
