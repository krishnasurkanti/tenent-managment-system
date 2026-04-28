"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { removeTenant } from "@/services/tenants/tenants.service";
import type { TenantRecord } from "@/types/tenant";

export function RemoveTenantSearch({ tenants }: { tenants: TenantRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return tenants.filter((tenant) => {
      const tenantIdMatch = tenant.tenantId.includes(normalizedQuery);
      const nameMatch = tenant.fullName.toLowerCase().includes(normalizedQuery);
      return tenantIdMatch || nameMatch;
    });
  }, [normalizedQuery, tenants]);

  const selectedTenant = matches.find((tenant) => tenant.tenantId === selectedTenantId) ?? null;

  const closeModal = () => {
    if (submitting) {
      return;
    }

    setOpen(false);
    setQuery("");
    setSelectedTenantId("");
    setConfirmed(false);
    setSubmitting(false);
    setMessage("");
    setError("");
  };

  const handleRemove = async () => {
    if (!selectedTenant) {
      setError("Select a tenant before removing. Search and choose the tenant first.");
      return;
    }

    if (!confirmed) {
      setError("Please confirm you understand this action before proceeding.");
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    const { response, data } = await removeTenant(selectedTenant.tenantId);

    if (!response.ok) {
      setError(data.message ?? "Unable to remove tenant.");
      setSubmitting(false);
      return;
    }

    setMessage(`${selectedTenant.fullName} was removed. Room and bed are now available again.`);
    setSubmitting(false);
    router.refresh();
  };

  return (
    <>
      <Button
        className="min-h-12 w-full rounded-2xl border border-white/80 bg-[linear-gradient(90deg,#ff8ca6_0%,#ff6e8d_100%)] px-4 text-[13px] font-semibold text-white shadow-[0_16px_30px_rgba(255,110,141,0.2)] hover:opacity-95"
        onClick={() => {
          setQuery("");
          setSelectedTenantId("");
          setSubmitting(false);
          setMessage("");
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove Tenant
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-none touch-pan-y bg-[rgba(48,28,75,0.28)] px-4 py-4 sm:py-8">
          <div className="flex min-h-full items-center justify-center">
            <Card className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(244,236,255,0.95)_100%)] p-6 shadow-[0_28px_70px_rgba(170,148,255,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm">
                  <span className="rounded-full bg-[linear-gradient(135deg,#ff8ca6_0%,#ff6e8d_100%)] p-1 text-white">
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                  Remove Tenant
                </div>
                <h2 className="mt-3 text-2xl font-semibold">Remove Tenant</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Search by tenant ID or name, confirm room and floor details, then remove the tenant from the hostel.
                </p>
              </div>
              <Button variant="ghost" disabled={submitting} aria-label="Close" className="rounded-2xl px-3" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto overscroll-none touch-pan-y pr-1">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Search by tenant ID or name</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedTenantId("");
                      setConfirmed(false);
                      setMessage("");
                      setError("");
                    }}
                    disabled={submitting}
                    placeholder="Type last 5-digit ID or tenant name"
                    className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 pl-11 text-sm outline-none shadow-sm"
                  />
                </div>
              </label>

              {!normalizedQuery ? (
                <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-4 text-sm text-[var(--muted-foreground)] shadow-sm">
                  Start typing a tenant ID or name to find the tenant.
                </div>
              ) : matches.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-4 py-4 text-sm text-[color:var(--error)]">
                  No tenant matched that search.
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((tenant) => {
                    const active = selectedTenantId === tenant.tenantId;

                    return (
                      <button
                        key={tenant.tenantId}
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setSelectedTenantId(tenant.tenantId);
                          setConfirmed(false);
                          setMessage("");
                          setError("");
                        }}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-[color:var(--error)] bg-[linear-gradient(180deg,rgba(220,38,38,0.18)_0%,rgba(254,226,226,0.92)_100%)]"
                            : "border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] hover:border-[color:color-mix(in_srgb,var(--error)_34%,transparent)]"
                        }`}
                      >
                        <p className="font-semibold text-[var(--foreground)]">{tenant.fullName}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Tenant ID {tenant.tenantId} • {tenant.phone}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Floor {tenant.assignment?.floorNumber ?? "-"} • Room {tenant.assignment?.roomNumber ?? "-"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedTenant ? (
                <>
                  <div className="rounded-2xl border border-[color:var(--error)] bg-[linear-gradient(180deg,rgba(220,38,38,0.14)_0%,rgba(254,226,226,0.92)_100%)] p-4 text-sm text-[color:var(--error)]">
                    <p className="font-semibold text-[#991b1b]">{selectedTenant.fullName}</p>
                    <p className="mt-1">Tenant ID: {selectedTenant.tenantId}</p>
                    <p className="mt-1">
                      Floor {selectedTenant.assignment?.floorNumber ?? "-"} / Room {selectedTenant.assignment?.roomNumber ?? "-"}
                    </p>
                    <p className="mt-1">Removing this tenant will free the assigned room/bed for reuse. Payment history is preserved.</p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--error)] bg-[linear-gradient(180deg,rgba(220,38,38,0.08)_0%,rgba(254,226,226,0.7)_100%)] p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                    />
                    <span className="text-[#991b1b]">
                      I understand that <strong>{selectedTenant.fullName}</strong> will be removed from this hostel. This cannot be undone.
                    </span>
                  </label>
                </>
              ) : null}
            </div>

            {error ? <p className="mt-4 text-sm text-[color:var(--error)]">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" disabled={submitting} onClick={closeModal} className="rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)]">
                Cancel
              </Button>
              <Button variant="danger" disabled={submitting} onClick={handleRemove} className={submitting ? "opacity-70" : ""}>
                {submitting ? "Removing..." : "Remove Tenant"}
              </Button>
            </div>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
