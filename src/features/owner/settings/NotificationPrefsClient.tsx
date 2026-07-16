"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";

const STORAGE_KEY = "notification_prefs_v1";

type NotifPrefs = {
  overdueAlerts: boolean;
  dueSoonReminders: boolean;
  weeklySummary: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  overdueAlerts: true,
  dueSoonReminders: true,
  weeklySummary: true,
};

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

const TOGGLES: { key: keyof NotifPrefs; label: string; description: string }[] = [
  {
    key: "overdueAlerts",
    label: "Overdue rent alerts",
    description: "Highlight tenants past their due date in red",
  },
  {
    key: "dueSoonReminders",
    label: "Due soon reminders",
    description: "Show warnings for tenants due within 3 days",
  },
  {
    key: "weeklySummary",
    label: "Weekly summary badge",
    description: "Show collection summary on the dashboard",
  },
];

export function NotificationPrefsClient() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted) return null;

  const update = (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
          <Bell size={16} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
            Preferences
          </p>
          <p className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">In-app notifications</p>
        </div>
      </div>

      <div className="space-y-3">
        {TOGGLES.map(({ key, label, description }) => (
          <label key={key} className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-white">{label}</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => update(key, !prefs[key])}
              className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                prefs[key] ? "bg-[color:var(--accent)]" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  prefs[key] ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-[color:var(--fg-secondary)]">
        Preferences are saved locally on this device.
      </p>
    </Card>
  );
}
