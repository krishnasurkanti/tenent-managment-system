"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { removeTenant } from "@/services/tenants/tenants.service";
import { fmtTenantId } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

export function RemoveTenantSearch({ tenants }: { tenants: TenantRecord[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [advanceRefundEligible, setAdvanceRefundEligible] = useState(false);
  const [refundAdvance, setRefundAdvance] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [settlementNote, setSettlementNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return tenants.filter((t) =>
      t.tenantId.includes(normalizedQuery) || t.fullName.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, tenants]);

  const selectedTenant = matches.find((t) => t.tenantId === selectedTenantId) ?? null;

  const closeModal = () => {
    if (submitting) return;
    setOpen(false);
    setQuery("");
    setSelectedTenantId("");
    setAdvanceRefundEligible(false);
    setRefundAdvance(false);
    setRefundAmount("");
    setSettlementNote("");
    setConfirmed(false);
    setSubmitting(false);
    setMessage("");
    setError("");
  };

  const handleRemove = async () => {
    if (!selectedTenant) { setError("Select a tenant before removing."); return; }
    if (!confirmed) { setError("Please confirm before proceeding."); return; }
    if (submitting) return;

    const numericRefund = Number(refundAmount || 0);
    if (Number.isNaN(numericRefund) || numericRefund < 0) { setError("Enter a valid refund amount."); return; }

    setSubmitting(true);
    setError("");
    setMessage("");

    const { response, data } = await removeTenant(selectedTenant.tenantId, {
      advanceRefundEligible,
      refundAdvance,
      refundAmount: refundAdvance ? numericRefund : 0,
      settlementNote,
      settlementDate: new Date().toISOString().slice(0, 10),
    });

    if (!response.ok) {
      setError(data.message ?? "Unable to remove tenant.");
      setSubmitting(false);
      return;
    }

    setMessage(`${selectedTenant.fullName} was removed.`);
    setSubmitting(false);
    // Invalidate TanStack Query cache so tenant list updates immediately (F-07)
    void queryClient.invalidateQueries({ queryKey: ["owner-tenants"] });
    router.refresh();
  };

  return (
    <>
      <Button
        className="min-h-12 w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 text-[13px] font-semibold text-red-400 hover:bg-red-500/15 transition"
        variant="ghost"
        onClick={() => {
          setQuery(""); setSelectedTenantId(""); setSubmitting(false);
          setMessage(""); setError(""); setOpen(true);
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove Tenant
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-tenant-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4 sm:py-4"
          style={{ background: "rgba(2,6,23,0.80)", backdropFilter: "blur(6px)" }}
        >
          <Card className="flex w-full max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl rounded-b-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:w-[min(calc(100vw-2rem),42rem)] sm:max-h-[88dvh] sm:rounded-2xl sm:shadow-[0_40px_100px_rgba(0,0,0,0.6)]">

            {/* Header */}
            <div className="relative shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
              <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(239,68,68,0.12)_0%,rgba(220,38,38,0.05)_100%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div id="remove-tenant-modal-title" className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[13px] font-semibold text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Tenant
                  </div>
                  <p className="mt-2 text-[11px] text-white/45">Search by ID or name, confirm, then remove.</p>
                </div>
                <Button variant="ghost" disabled={submitting} aria-label="Close" className="rounded-2xl px-3 text-white/60 hover:text-white" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
              <div className="space-y-3">

                {/* Search */}
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Search by tenant ID or name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3">
                    <Search className="h-4 w-4 shrink-0 text-white/30" />
                    <input
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSelectedTenantId(""); setConfirmed(false); setMessage(""); setError(""); }}
                      disabled={submitting}
                      placeholder="Type last 5-digit ID or tenant name"
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                </label>

                {/* Results */}
                {!normalizedQuery ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[13px] text-white/40">
                    Start typing a tenant ID or name to find the tenant.
                  </div>
                ) : matches.length === 0 ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
                    No tenant matched that search.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matches.map((t) => {
                      const active = selectedTenantId === t.tenantId;
                      return (
                        <button
                          key={t.tenantId}
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setSelectedTenantId(t.tenantId);
                            setRefundAmount(String(t.advanceBalance ?? t.advanceAmount ?? 0));
                            setAdvanceRefundEligible(false);
                            setRefundAdvance(false);
                            setSettlementNote("");
                            setConfirmed(false);
                            setMessage(""); setError("");
                          }}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            active
                              ? "border-red-500/50 bg-red-500/15"
                              : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                        >
                          <p className="text-[13px] font-semibold text-white">{t.fullName}</p>
                          <p className="mt-0.5 text-[11px] text-white/45">
                            #{fmtTenantId(t.tenantId)} · {t.phone || "No phone"} · Room {t.assignment?.roomNumber ?? "Unassigned"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Settlement section */}
                {selectedTenant ? (
                  <>
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-400">Selected tenant</p>
                      <p className="mt-1 text-[14px] font-semibold text-white">{selectedTenant.fullName}</p>
                      <p className="mt-0.5 text-[11px] text-white/45">
                        #{fmtTenantId(selectedTenant.tenantId)} · Room {selectedTenant.assignment?.roomNumber ?? "Unassigned"}
                      </p>
                      <p className="mt-1.5 text-[11px] text-white/40">Removing frees room/bed for reuse. Payment history preserved.</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
                      <p className="text-[12px] font-semibold text-white/70">Vacating settlement</p>
                      <p className="text-[11px] text-white/40">
                        Suggested refundable advance: ₹{(selectedTenant.advanceBalance ?? selectedTenant.advanceAmount ?? 0).toLocaleString("en-IN")}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 cursor-pointer">
                          <input type="checkbox" checked={advanceRefundEligible} onChange={(e) => setAdvanceRefundEligible(e.target.checked)} disabled={submitting} className="mt-0.5 h-4 w-4 accent-emerald-500" />
                          <span className="text-[12px] text-white/70">Advance refund eligible?</span>
                        </label>
                        <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 cursor-pointer">
                          <input type="checkbox" checked={refundAdvance} onChange={(e) => setRefundAdvance(e.target.checked)} disabled={submitting} className="mt-0.5 h-4 w-4 accent-emerald-500" />
                          <span className="text-[12px] text-white/70">Refund advance?</span>
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Refund amount</span>
                        <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            disabled={submitting || !refundAdvance}
                            className="w-full bg-transparent text-[13px] text-white outline-none disabled:opacity-40 placeholder:text-white/25"
                          />
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Note (optional)</span>
                        <textarea
                          value={settlementNote}
                          onChange={(e) => setSettlementNote(e.target.value)}
                          disabled={submitting}
                          rows={2}
                          maxLength={500}
                          placeholder="Optional settlement note"
                          className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </label>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-3 text-[12px]">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        disabled={submitting}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-red-500"
                      />
                      <span className="text-red-300">
                        I understand <strong>{selectedTenant.fullName}</strong> will be permanently removed. This cannot be undone.
                      </span>
                    </label>
                  </>
                ) : null}

                {error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-400">{error}</p> : null}
                {message ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[13px] text-emerald-400">{message}</p> : null}
                {submitting ? <ProcessingPill label="Removing tenant…" /> : null}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/10 bg-[#09090b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="secondary" disabled={submitting} onClick={closeModal} className="w-full rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white sm:flex-1">
                  Cancel
                </Button>
                <Button
                  disabled={submitting || !confirmed}
                  onClick={() => void handleRemove()}
                  className="w-full rounded-2xl bg-[linear-gradient(90deg,#b91c1c_0%,#dc2626_100%)] text-white shadow-[0_10px_24px_rgba(185,28,28,0.3)] hover:brightness-110 disabled:opacity-50 sm:flex-1"
                >
                  {submitting ? "Removing…" : "Remove Tenant"}
                </Button>
              </div>
            </div>

          </Card>
        </div>
      ) : null}
    </>
  );
}
