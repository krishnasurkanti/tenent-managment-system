"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ownerPanelClass } from "@/components/ui/owner-theme";
import type { OwnerHostel } from "@/types/owner-hostel";
import type { TenantRecord } from "@/types/tenant";

const STORAGE_KEY = "onboarding_v1";

type ChecklistState = {
  dismissed: boolean;
  exploredReports: boolean;
};

function loadState(): ChecklistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: false, exploredReports: false };
    return JSON.parse(raw) as ChecklistState;
  } catch {
    return { dismissed: false, exploredReports: false };
  }
}

function saveState(state: ChecklistState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function OnboardingChecklist({
  hostel,
  tenants,
}: {
  hostel: OwnerHostel | null;
  tenants: TenantRecord[];
}) {
  const [state, setState] = useState<ChecklistState>({ dismissed: false, exploredReports: false });
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted || state.dismissed) return null;

  const hasAnyPayment = tenants.some((t) => t.rentPaid > 0);
  const hasAssignment = tenants.some((t) => !!t.assignment);

  const steps = [
    {
      id: "hostel",
      label: "Create your hostel",
      done: !!hostel,
      href: hostel ? null : "/owner/create-hostel",
      manual: false,
    },
    {
      id: "tenant",
      label: "Add your first tenant",
      done: tenants.length > 0,
      href: tenants.length === 0 ? "/owner/tenants?action=add-tenant" : null,
      manual: false,
    },
    {
      id: "payment",
      label: "Record first rent payment",
      done: hasAnyPayment,
      href: !hasAnyPayment ? "/owner/payments" : null,
      manual: false,
    },
    {
      id: "assign",
      label: "Assign tenants to rooms",
      done: hasAssignment,
      href: !hasAssignment ? "/owner/rooms" : null,
      manual: false,
    },
    {
      id: "reports",
      label: "Explore reports",
      done: state.exploredReports,
      href: !state.exploredReports ? "/owner/reports" : null,
      manual: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  const handleMarkReport = () => {
    const next = { ...state, exploredReports: true };
    setState(next);
    saveState(next);
  };

  const handleDismiss = () => {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(next);
  };

  return (
    <Card className={`${ownerPanelClass} p-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--accent)] text-[11px] font-bold text-[color:var(--accent)]">
            {completedCount}/{steps.length}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white">Getting started</p>
            <p className="text-[11px] text-[color:var(--fg-secondary)]">
              {completedCount === steps.length
                ? "All steps complete!"
                : `${steps.length - completedCount} step${steps.length - completedCount === 1 ? "" : "s"} remaining`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-xl p-1.5 text-white/40 transition hover:bg-white/8 hover:text-white/70"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            className="rounded-xl p-1.5 text-white/40 transition hover:bg-white/8 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-1">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-white/20" />
              )}
              {step.done ? (
                <span className="text-[12px] text-white/40 line-through">{step.label}</span>
              ) : step.href ? (
                <Link
                  href={step.href}
                  onClick={step.manual ? handleMarkReport : undefined}
                  className="text-[12px] text-[color:var(--accent-electric)] hover:underline"
                >
                  {step.label}
                </Link>
              ) : (
                <span className="text-[12px] text-white">{step.label}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
