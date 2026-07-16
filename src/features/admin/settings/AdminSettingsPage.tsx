"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchAdminSettings, updateAdminFeatureFlag } from "@/services/admin/admin.service";
import type { AdminLog, AdminSettingsFeatures } from "@/types/admin";

export default function AdminSettingsPage() {
  const [features, setFeatures] = useState<AdminSettingsFeatures>({});
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const load = async () => {
    const { data } = await fetchAdminSettings();
    setFeatures(data.features);
    setLogs(data.logs);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const toggleFeature = async (name: string, enabled: boolean) => {
    await updateAdminFeatureFlag(name, enabled);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">System controls</p>
        <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Settings</h1>
        <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Feature access, usage controls, and activity logs.</p>
      </header>

      <Card className="p-4">
        <h2 className="text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">Feature flags</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(features).map(([name, enabled]) => (
            <label key={name} className="flex cursor-pointer items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
              <span className="text-sm capitalize text-[color:var(--fg-secondary)]">{name.replace(/_/g, " ")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggleFeature(name, !enabled)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? "bg-[color:var(--accent)]" : "bg-[color:var(--surface-strong)]"}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">Activity logs</h2>
        <div className="mt-3 flex flex-col gap-2">
          {logs.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-tertiary)]">No logs available.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
                <p className="text-xs text-[color:var(--fg-tertiary)]">{new Date(log.createdAt).toLocaleString("en-IN")}</p>
                <p className="text-sm font-semibold text-[color:var(--fg-primary)]">{log.event}</p>
                <p className="text-sm text-[color:var(--fg-secondary)]">{log.detail}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
