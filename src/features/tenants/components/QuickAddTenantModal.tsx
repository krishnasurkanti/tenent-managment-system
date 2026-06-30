"use client";

import { useRef, useState } from "react";
import { AlertCircle, CalendarDays, IndianRupee, Phone, User, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { createTenant } from "@/services/tenants/tenants.service";
import type { TenantRecord } from "@/types/tenant";

function normalizePhone(v: string) {
  return v.replace(/\D/g, "").replace(/^91/, "").slice(0, 10);
}
function formatPhoneDisplay(v: string) {
  const d = normalizePhone(v);
  return d.length <= 5 ? d : `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function QuickAddTenantModal({
  open,
  onClose,
  onCreated,
  hostelId,
  asPage = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
  hostelId?: string;
  /** Render as inline page element (no overlay, no body lock) */
  asPage?: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(asPage ? false : open);

  if (!asPage && !open) return null;

  const reset = () => {
    setFullName(""); setPhone(""); setMonthlyRent("");
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setSubmitting(false); setError("");
  };

  const handleClose = () => { if (submitting) return; reset(); onClose(); };

  const handleSave = async () => {
    if (!fullName.trim()) { setError("Name is required."); nameRef.current?.focus(); return; }
    if (!monthlyRent || Number(monthlyRent) <= 0) { setError("Enter monthly rent."); return; }
    if (!joiningDate) { setError("Enter joining date."); return; }
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const { response, data } = await createTenant({
        fullName: fullName.trim(),
        phone: phone || undefined,
        monthlyRent,
        rentPaid: "0",
        paidOnDate: joiningDate,
        billingCycle: "monthly",
        hostelId: hostelId ?? undefined,
      });

      if (!response.ok) {
        setError(data.message ?? "Unable to create tenant.");
        setSubmitting(false);
        return;
      }

      reset();
      // onClose intentionally NOT called — onCreated handles navigation
      onCreated(data.tenant as TenantRecord);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      {...(!asPage && { role: "dialog", "aria-modal": "true" })}
      aria-labelledby="quick-add-title"
      className={asPage
        ? "w-full"
        : "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4 sm:py-4"
      }
      {...(!asPage && { style: { background: "rgba(2,6,23,0.76)", backdropFilter: "blur(6px)" } })}
    >
      <Card className={asPage
        ? "flex w-full flex-col overflow-hidden rounded-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0"
        : "flex w-full min-h-[72dvh] flex-col overflow-hidden rounded-t-3xl rounded-b-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:w-[min(calc(100vw-2rem),34rem)] sm:min-h-0 sm:rounded-2xl sm:shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      }>
        {/* Header */}
        <div className="relative px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(234,179,8,0.12)_0%,rgba(99,102,241,0.06)_100%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div id="quick-add-title" className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[13px] font-semibold text-amber-300">
                <Zap className="h-3.5 w-3.5" />
                Quick Add
              </div>
              <p className="mt-2 text-[11px] text-white/45">Name + rent only. Fill remaining details later.</p>
            </div>
            {!asPage && (
              <Button variant="ghost" disabled={submitting} aria-label="Close" onClick={handleClose} className="rounded-2xl px-3 text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 pb-4 sm:px-5">
          {/* Name */}
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Full Name *</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3">
              <User className="h-4 w-4 shrink-0 text-amber-400" />
              <input
                ref={nameRef}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSave()}
                disabled={submitting}
                placeholder="Tenant full name"
                autoFocus
                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Phone */}
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Phone <span className="font-normal text-white/35">(optional)</span></span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3">
                <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-[13px] font-medium text-white/50">+91</span>
                <input
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  disabled={submitting}
                  type="tel"
                  inputMode="tel"
                  placeholder="98765 43210"
                  className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                />
              </div>
            </label>

            {/* Rent */}
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Monthly Rent *</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3">
                <IndianRupee className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span className="text-[13px] font-semibold text-white/55">₹</span>
                <input
                  type="number"
                  min="0"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                  disabled={submitting}
                  placeholder="8500"
                  className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                />
              </div>
            </label>
          </div>

          {/* Joining date */}
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Joining Date *</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-sky-400" />
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                disabled={submitting}
                className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          {submitting ? <ProcessingPill label="Creating tenant…" /> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-3 sm:flex-row">
            <Button variant="secondary" onClick={handleClose} disabled={submitting} className="w-full rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white sm:flex-1">
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={submitting} className="w-full rounded-2xl bg-[linear-gradient(90deg,#b45309_0%,#d97706_100%)] text-white shadow-[0_10px_24px_rgba(180,83,9,0.3)] sm:flex-1">
              {submitting ? "Saving…" : "Save Tenant"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
