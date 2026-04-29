"use client";

import { useEffect, useState } from "react";
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
    void load();
  }, []);

  const toggleFeature = async (name: string, enabled: boolean) => {
    await updateAdminFeatureFlag(name, enabled);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-white/70 bg-white/90 p-3 sm:p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">System Controls</h1>
        <p className="mt-1 text-sm text-slate-600">Manage feature access, usage controls, and basic activity logs.</p>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Feature Flags</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(features).map(([name, enabled]) => (
            <label key={name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">{name.replace(/_/g, " ")}</span>
              <input type="checkbox" checked={enabled} onChange={(event) => toggleFeature(name, event.target.checked)} />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Basic Logs</h2>
        <div className="mt-3 space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No logs available.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("en-IN")}</p>
                <p className="text-sm font-semibold text-slate-800">{log.event}</p>
                <p className="text-sm text-slate-600">{log.detail}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
