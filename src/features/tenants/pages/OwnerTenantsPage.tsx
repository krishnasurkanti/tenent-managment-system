"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download, LogOut, Plus, UserCheck, UserRound, Wallet, Zap } from "lucide-react";
import { TenantAvatar } from "@/components/ui/tenant-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/form/search-input";
import { StatusBadge } from "@/components/ui/data/status-badge";
import { DataTable, type Column } from "@/components/ui/data/data-table";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { SkeletonBlock, SkeletonStatCard, SkeletonTableRow } from "@/components/ui/skeleton";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus, fmtTenantId } from "@/utils/payment";
import { type TenantRecord } from "@/types/tenant";

const PaymentCollectionModal = dynamic(
  () => import("@/components/ui/payment-collection-modal").then((m) => ({ default: m.PaymentCollectionModal })),
  { ssr: false },
);
const RemoveTenantSearch = dynamic(
  () => import("@/features/tenants/components/RemoveTenantSearch").then((m) => ({ default: m.RemoveTenantSearch })),
  { ssr: false },
);

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function OwnerTenantsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OwnerTenantsPageContent />
    </Suspense>
  );
}

function OwnerTenantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);

  const [tenantOverrides, setTenantOverrides] = useState<Record<string, TenantRecord>>({});
  const [paymentTenant, setPaymentTenant] = useState<TenantRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

  const tenants = useMemo(() => {
    if (!currentHostel) return [];
    return allTenants
      .filter((t) => t.hostelId === currentHostel.id || t.assignment?.hostelId === currentHostel.id)
      .map((t) => tenantOverrides[t.tenantId] ?? t);
  }, [allTenants, currentHostel, tenantOverrides]);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((t) => {
      const room = t.assignment?.roomNumber?.toLowerCase() ?? "";
      return (
        t.tenantId.toLowerCase().includes(query) ||
        fmtTenantId(t.tenantId).includes(query) ||
        t.fullName.toLowerCase().includes(query) ||
        t.phone.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        room.includes(query)
      );
    });
  }, [searchQuery, tenants]);

  const dueSoonCount = filteredTenants.filter((t) => {
    const tone = getDueStatus(t.nextDueDate).tone;
    return tone === "orange" || tone === "yellow";
  }).length;
  const overdueCount = filteredTenants.filter((t) => getDueStatus(t.nextDueDate).tone === "red").length;
  const assignedCount = filteredTenants.filter((t) => t.assignment).length;

  const openPayment = useCallback((tenant: TenantRecord) => setPaymentTenant(tenant), []);
  const handlePaymentSuccess = useCallback((updated: TenantRecord) => {
    setTenantOverrides((prev) => ({ ...prev, [updated.tenantId]: updated }));
    setPaymentTenant(null);
  }, []);

  const mobileListRef = useRef<HTMLDivElement>(null);
  const [mobileScrollMargin, setMobileScrollMargin] = useState(0);
  useLayoutEffect(() => {
    if (mobileListRef.current) setMobileScrollMargin(mobileListRef.current.offsetTop);
  }, []);

  // Virtualizer only on mobile — unconditional useWindowVirtualizer on wide
  // viewports triggered "Maximum update depth exceeded" with many tenants.
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const mobileVirtualizer = useWindowVirtualizer({
    count: filteredTenants.length,
    estimateSize: () => 150,
    overscan: 3,
    scrollMargin: mobileScrollMargin,
    enabled: isMobileViewport,
  });

  const columns = useMemo<Column<TenantRecord>[]>(() => [
    {
      key: "id",
      header: "ID",
      render: (t) => <span className="font-semibold text-[color:var(--fg-secondary)]">{fmtTenantId(t.tenantId)}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (t) => (
        <div className="flex items-center gap-2">
          <Link href={`/owner/tenants/${t.tenantId}`} className="font-medium text-[color:var(--fg-primary)] hover:text-[color:var(--accent-electric)]">
            {t.fullName}
          </Link>
          {t.pendingBalance && t.pendingBalance.amount > 0 ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--warning)] bg-[color:var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--warning)]">
              Bal {inr(t.pendingBalance.amount)}
            </span>
          ) : null}
          {hasMissingInfo(t) ? <MissingInfoBadge onClick={() => router.push(`/owner/tenants/${t.tenantId}/complete-profile`)} /> : null}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (t) => (
        <div>
          <p className="text-[color:var(--fg-primary)]">{t.phone}</p>
          <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{t.email}</p>
        </div>
      ),
    },
    { key: "room", header: "Room", render: (t) => (t.assignment ? `Room ${t.assignment.roomNumber}` : "Pending") },
    { key: "rent", header: "Rent", render: (t) => inr(t.monthlyRent) },
    { key: "due", header: "Next Due", render: (t) => formatPaymentDate(t.nextDueDate) },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (t) => {
        const status = getDueStatus(t.nextDueDate, t.billingCycle);
        const isPaid = !["red", "orange", "yellow"].includes(status.tone);
        return (
          <div className="flex items-center justify-end gap-2">
            <CollectAction tone={status.tone} isPaid={isPaid} onClick={() => openPayment(t)} />
            <button
              type="button"
              onClick={() => router.push(`/owner/tenants/${t.tenantId}/vacate`)}
              title="Vacate tenant"
              className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] px-2.5 text-[11px] font-semibold text-[color:var(--error)] hover:brightness-110"
            >
              <LogOut size={13} /> Vacate
            </button>
          </div>
        );
      },
    },
  ], [router, openPayment]);

  if (hostelLoading || tenantLoading) return <LoadingState />;

  if (!currentHostel) {
    return (
      <Card className="p-6 text-center">
        <EmptyState
          title="No hostel selected"
          description="Create a hostel to start managing tenants."
          action={
            <Button onClick={() => router.push("/owner/create-hostel")}>Create Hostel</Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      {/* ── Header ── */}
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Tenant directory</p>
            <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Tenants</h1>
            <p className="truncate text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/api/tenants/export?hostelId=${encodeURIComponent(currentHostel.id)}`}
              download
              className="hidden min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 text-[12px] font-semibold text-[color:var(--fg-primary)] hover:bg-[color:var(--surface-strong)] lg:inline-flex"
            >
              <Download size={14} /> Export
            </a>
            <button
              type="button"
              onClick={() => router.push("/owner/tenants/quick-add")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color:var(--warning-soft)] px-3 text-[12px] font-semibold text-[color:var(--warning)]"
            >
              <Zap size={14} /> Quick
            </button>
            <Button size="medium" onClick={() => router.push("/owner/tenants/new")}>
              <Plus size={16} /> Add
            </Button>
          </div>
        </div>
        <RemoveTenantSearch tenants={tenants} />
        <SearchInput value={searchQuery} onValueChange={setSearchQuery} placeholder="Search name, room, contact…" />
      </header>

      {/* ── Summary ── */}
      {!searchQuery ? (
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard icon={<UserRound size={14} />} label="Total" value={filteredTenants.length} />
          <StatCard icon={<Wallet size={14} />} label="Due soon" value={dueSoonCount} tone={dueSoonCount ? "warning" : "plain"} />
          <StatCard icon={<Wallet size={14} />} label="Overdue" value={overdueCount} tone={overdueCount ? "danger" : "plain"} />
          <StatCard icon={<UserCheck size={14} />} label="Assigned" value={assignedCount} tone={assignedCount ? "success" : "plain"} />
        </section>
      ) : null}

      {/* ── Mobile: virtualized card list ── */}
      <section className="lg:hidden">
        {filteredTenants.length === 0 ? (
          <Card>
            <EmptyState
              icon={<UserRound size={28} />}
              title={searchQuery ? "No matches" : "No tenants yet"}
              description={searchQuery ? "Try a different name, phone, or room." : "Add your first tenant to start tracking rent."}
              action={!searchQuery ? <Button onClick={() => router.push("/owner/tenants/new")}><Plus size={16} /> Add tenant</Button> : undefined}
            />
          </Card>
        ) : (
          <div ref={mobileListRef} style={{ height: `${mobileVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {mobileVirtualizer.getVirtualItems().map((vi) => {
              const tenant = filteredTenants[vi.index];
              const status = getDueStatus(tenant.nextDueDate, tenant.billingCycle);
              const isPaid = !["red", "orange", "yellow"].includes(status.tone);
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={mobileVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vi.start - mobileVirtualizer.options.scrollMargin}px)`,
                    paddingBottom: 10,
                  }}
                >
                  <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-1)]">
                    <div className="flex items-start gap-3">
                      <TenantAvatar tenantId={tenant.tenantId} size="sm" readOnly />
                      <div className="min-w-0 flex-1">
                        <Link href={`/owner/tenants/${tenant.tenantId}`} className="block">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">{tenant.fullName}</p>
                            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--fg-secondary)]">#{fmtTenantId(tenant.tenantId)}</span>
                            {tenant.pendingBalance && tenant.pendingBalance.amount > 0 ? (
                              <span className="rounded-full border border-[color:var(--warning)] bg-[color:var(--warning-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--warning)]">Bal {inr(tenant.pendingBalance.amount)}</span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[color:var(--fg-secondary)]">
                            {tenant.assignment ? `Room ${tenant.assignment.roomNumber}` : "Pending assignment"} · {tenant.phone}
                          </p>
                        </Link>
                        {hasMissingInfo(tenant) ? (
                          <div className="mt-1">
                            <MissingInfoBadge onClick={() => router.push(`/owner/tenants/${tenant.tenantId}/complete-profile`)} />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[length:var(--text-sm-size)] font-bold tabular-nums text-[color:var(--fg-primary)]">{inr(tenant.monthlyRent)}</span>
                        <span className="text-[10px] text-[color:var(--fg-tertiary)]">{formatPaymentDate(tenant.nextDueDate)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {isPaid ? (
                        <div className="flex-1"><StatusBadge status="paid">Paid</StatusBadge></div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPayment(tenant)}
                          className={`flex-1 rounded-[var(--radius-md)] py-2 text-[12px] font-semibold ${
                            status.tone === "red"
                              ? "border border-[color:var(--error)] bg-[color:var(--error-soft)] text-[color:var(--error)]"
                              : "border border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]"
                          }`}
                        >
                          {status.tone === "red" ? "Pay Now" : `Collect ${inr(tenant.monthlyRent)}`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/owner/tenants/${tenant.tenantId}/vacate`)}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] px-3 text-[11px] font-semibold text-[color:var(--error)] hover:bg-[color:var(--error-soft)]"
                      >
                        <LogOut size={13} /> Vacate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Desktop: table ── */}
      <section className="hidden lg:block">
        <DataTable
          columns={columns}
          rows={filteredTenants}
          getRowKey={(t) => t.tenantId}
          emptyLabel={searchQuery ? "No tenants matched that search." : "No tenants created yet for this hostel."}
        />
      </section>

      <PaymentCollectionModal
        open={!!paymentTenant}
        tenant={paymentTenant}
        onClose={() => setPaymentTenant(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

function CollectAction({ tone, isPaid, onClick }: { tone: string; isPaid: boolean; onClick: () => void }) {
  if (isPaid) return <StatusBadge status="paid">Paid</StatusBadge>;
  const isOverdue = tone === "red";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-[var(--radius-md)] px-3 text-[11px] font-semibold hover:brightness-110 active:scale-95 ${
        isOverdue
          ? "border border-[color:var(--error)] bg-[color:var(--error-soft)] text-[color:var(--error)]"
          : "border border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]"
      }`}
    >
      {isOverdue ? "Pay Now" : "Collect Rent"}
    </button>
  );
}

function MissingInfoBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--warning)] bg-[color:var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--warning)] hover:brightness-110"
    >
      <AlertTriangle size={11} /> Missing info
    </button>
  );
}

function hasMissingInfo(tenant: TenantRecord) {
  return !tenant.phone || !tenant.idType || !tenant.idPhotoUrl;
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock className="h-20 rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)] lg:block">
        <table className="min-w-[520px]">
          <thead>
            <tr className="bg-[color:var(--surface-soft)]">
              {["ID", "Name", "Contact", "Room", "Rent", "Next Due", "Action"].map((c) => (
                <th key={c} className="px-3 py-2.5 text-left"><SkeletonBlock className="h-3 w-16 rounded-full" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5 lg:hidden">
        <ProcessingPill label="Preparing tenant directory" />
        {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-32 rounded-[var(--radius-lg)]" />)}
      </div>
    </div>
  );
}
