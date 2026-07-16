"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay/modal";
import { SearchInput } from "@/components/ui/form/search-input";
import { FormField } from "@/components/ui/form/field";
import { AmountInput } from "@/components/ui/form/amount-input";
import { Textarea } from "@/components/ui/form/textarea";
import { ProcessingPill } from "@/components/ui/processing-pill";
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
    if (!selectedTenant) return setError("Select a tenant before removing.");
    if (!confirmed) return setError("Please confirm before proceeding.");
    if (submitting) return;

    const numericRefund = Number(refundAmount || 0);
    if (Number.isNaN(numericRefund) || numericRefund < 0) return setError("Enter a valid refund amount.");

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
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setSelectedTenantId("");
          setSubmitting(false);
          setMessage("");
          setError("");
          setOpen(true);
        }}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] px-4 text-[13px] font-semibold text-[color:var(--error)] hover:brightness-110"
      >
        <Trash2 size={16} /> Remove Tenant
      </button>

      {open ? (
        <Modal
          open
          onClose={closeModal}
          size="lg"
          title="Remove tenant"
          description="Search by ID or name, confirm, then remove."
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="secondary" fullWidth disabled={submitting} onClick={closeModal} className="sm:flex-1">Cancel</Button>
              <Button
                fullWidth
                disabled={submitting || !confirmed}
                onClick={() => void handleRemove()}
                className="bg-[linear-gradient(90deg,#b91c1c_0%,#dc2626_100%)] sm:flex-1"
              >
                {submitting ? "Removing…" : "Remove Tenant"}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <FormField label="Search by tenant ID or name">
              {({ id }) => (
                <SearchInput
                  id={id}
                  value={query}
                  onValueChange={(v) => { setQuery(v); setSelectedTenantId(""); setConfirmed(false); setMessage(""); setError(""); }}
                  placeholder="Type last 5-digit ID or tenant name"
                />
              )}
            </FormField>

            {!normalizedQuery ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4 text-[13px] text-[color:var(--fg-tertiary)]">
                Start typing a tenant ID or name to find the tenant.
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-[13px] text-[color:var(--error)]">
                No tenant matched that search.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
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
                        setMessage("");
                        setError("");
                      }}
                      className={`w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition ${
                        active
                          ? "border-[color:color-mix(in_srgb,var(--error)_50%,transparent)] bg-[color:var(--error-soft)]"
                          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--border-strong)]"
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-[color:var(--fg-primary)]">{t.fullName}</p>
                      <p className="mt-0.5 text-[11px] text-[color:var(--fg-tertiary)]">
                        #{fmtTenantId(t.tenantId)} · {t.phone || "No phone"} · Room {t.assignment?.roomNumber ?? "Unassigned"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTenant ? (
              <>
                <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_30%,transparent)] bg-[color:var(--error-soft)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--error)]">Selected tenant</p>
                  <p className="mt-1 text-[14px] font-semibold text-[color:var(--fg-primary)]">{selectedTenant.fullName}</p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--fg-tertiary)]">
                    #{fmtTenantId(selectedTenant.tenantId)} · Room {selectedTenant.assignment?.roomNumber ?? "Unassigned"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[color:var(--fg-tertiary)]">Removing frees room/bed for reuse. Payment history preserved.</p>
                </div>

                <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                  <p className="text-[12px] font-semibold text-[color:var(--fg-secondary)]">Vacating settlement</p>
                  <p className="text-[11px] text-[color:var(--fg-tertiary)]">
                    Suggested refundable advance: ₹{(selectedTenant.advanceBalance ?? selectedTenant.advanceAmount ?? 0).toLocaleString("en-IN")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckRow label="Advance refund eligible?" checked={advanceRefundEligible} disabled={submitting} onChange={setAdvanceRefundEligible} />
                    <CheckRow label="Refund advance?" checked={refundAdvance} disabled={submitting} onChange={setRefundAdvance} />
                  </div>
                  <FormField label="Refund amount">
                    {({ id }) => (
                      <AmountInput id={id} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value.replace(/[^\d.]/g, ""))} disabled={submitting || !refundAdvance} />
                    )}
                  </FormField>
                  <FormField label="Note (optional)">
                    {({ id }) => (
                      <Textarea id={id} value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} disabled={submitting} rows={2} maxLength={500} placeholder="Optional settlement note" />
                    )}
                  </FormField>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] p-3 text-[12px]">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={submitting} className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--error)]" />
                  <span className="text-[color:var(--error)]">
                    I understand <strong>{selectedTenant.fullName}</strong> will be permanently removed. This cannot be undone.
                  </span>
                </label>
              </>
            ) : null}

            {error ? <p className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-[13px] text-[color:var(--error)]">{error}</p> : null}
            {message ? <p className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color:var(--success-soft)] px-3 py-2.5 text-[13px] text-[color:var(--success)]">{message}</p> : null}
            {submitting ? <ProcessingPill label="Removing tenant…" /> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function CheckRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="mt-0.5 h-4 w-4 accent-[color:var(--success)]" />
      <span className="text-[12px] text-[color:var(--fg-secondary)]">{label}</span>
    </label>
  );
}
