"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, UserCheck, UserRound, Wallet } from "lucide-react";
import { TenantFormModal } from "@/features/tenants/components/TenantFormModal";
import { TenantRoomAssignmentModal } from "@/features/tenants/components/TenantRoomAssignmentModal";
import { PaymentCollectionModal } from "@/components/ui/payment-collection-modal";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { SkeletonBlock, SkeletonStatCard, SkeletonTableRow } from "@/components/ui/skeleton";
import { assignTenantRoom } from "@/services/tenants/tenants.service";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import {
  ownerHeroCardClass,
  ownerMetricToneClass,
  ownerPanelClass,
  ownerSubtlePanelClass,
  ownerTableHeadClass,
} from "@/components/ui/owner-theme";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

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

  const [createdTenants, setCreatedTenants] = useState<TenantRecord[]>([]);
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, TenantRecord>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [pendingTenant, setPendingTenant] = useState<TenantRecord | null>(null);
  const [paymentTenant, setPaymentTenant] = useState<TenantRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const preferredAssignment = useMemo(
    () => ({
      action: searchParams.get("action") ?? undefined,
      hostelId: searchParams.get("hostelId") ?? undefined,
      floorNumber: searchParams.get("floor") ? Number(searchParams.get("floor")) : undefined,
      roomNumber: searchParams.get("room") ?? undefined,
      sharingType: searchParams.get("sharingType") ?? undefined,
    }),
    [searchParams],
  );

  const shouldAutoAssign =
    preferredAssignment.action === "add-tenant" &&
    !!preferredAssignment.hostelId &&
    !!preferredAssignment.floorNumber &&
    !!preferredAssignment.roomNumber &&
    !!preferredAssignment.sharingType;

  useEffect(() => {
    setModalOpen(searchParams.get("action") === "add-tenant");
  }, [searchParams]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    router.replace("/owner/tenants");
  }, [router]);

  const tenants = useMemo(() => {
    if (!currentHostel) return [];

    const visibleTenantIds = new Set<string>();
    const scopedExisting = allTenants
      .filter((t) => t.assignment?.hostelId === currentHostel.id)
      .map((t) => {
        visibleTenantIds.add(t.tenantId);
        return tenantOverrides[t.tenantId] ?? t;
      });

    const scopedCreated = createdTenants.filter((t) => {
      if (visibleTenantIds.has(t.tenantId)) return false;
      return t.assignment?.hostelId === currentHostel.id || !t.assignment;
    });

    return [...scopedCreated, ...scopedExisting];
  }, [allTenants, createdTenants, currentHostel, tenantOverrides]);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tenants;

    return tenants.filter((t) => {
      const floor = t.assignment?.floorNumber ? String(t.assignment.floorNumber) : "";
      const room = t.assignment?.roomNumber?.toLowerCase() ?? "";
      return (
        t.tenantId.toLowerCase().includes(query) ||
        t.fullName.toLowerCase().includes(query) ||
        t.phone.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        floor.includes(query) ||
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

  const openPayment = useCallback((tenant: TenantRecord) => {
    setPaymentTenant(tenant);
  }, []);

  const handlePaymentSuccess = useCallback((updated: TenantRecord) => {
    setTenantOverrides((prev) => ({ ...prev, [updated.tenantId]: updated }));
    setPaymentTenant(null);
  }, []);

  if (hostelLoading || tenantLoading) return <LoadingState />;

  if (!currentHostel) {
    return (
      <Card className="rounded-[10px] p-5 text-center">
        <p className="text-sm font-semibold text-white">No hostel selected.</p>
        <Link
          href="/owner/create-hostel"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-4 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)]"
        >
          Create Hostel
        </Link>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      {/* ── Mobile view ── */}
      <section className="space-y-3 lg:hidden">
        <Card className={`${ownerHeroCardClass} rounded-[10px] p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Tenant hub</p>
              <h1 className="mt-1 text-xl font-semibold text-white">Tenants</h1>
              <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)]"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </button>
          </div>

          {/* Mobile search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, room, contact…"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <SummaryTile icon={UserRound} label="Total" value={String(filteredTenants.length)} />
            <SummaryTile icon={Wallet} label="Due soon" value={String(dueSoonCount)} tone="warning" />
            <SummaryTile icon={Wallet} label="Overdue" value={String(overdueCount)} tone="danger" />
            <SummaryTile icon={UserCheck} label="Assigned" value={String(assignedCount)} tone="success" />
          </div>
        </Card>

        <div className="space-y-2.5">
          {filteredTenants.length === 0 ? (
            <Card className={`${ownerPanelClass} rounded-[10px] p-4 text-center text-sm text-[color:var(--fg-secondary)]`}>
              {searchQuery ? "No tenants matched that search." : "No tenants yet for this hostel."}
            </Card>
          ) : (
            filteredTenants.map((tenant) => {
              const status = getDueStatus(tenant.nextDueDate);
              const isPaid = status.tone !== "red" && status.tone !== "orange" && status.tone !== "yellow";

              return (
                <div
                  key={tenant.tenantId}
                  className={`grid grid-cols-[1fr_auto] gap-3 rounded-[8px] px-3 py-3 ${ownerPanelClass}`}
                >
                  <Link href={`/owner/tenants/${tenant.tenantId}`} className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{tenant.fullName}</p>
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--fg-secondary)]">
                        #{tenant.tenantId}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[color:var(--fg-secondary)]">
                      {tenant.assignment ? `F${tenant.assignment.floorNumber} / R${tenant.assignment.roomNumber}` : "Pending assignment"} / {tenant.phone}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <MiniInfo label="Rent" value={`Rs ${tenant.monthlyRent.toLocaleString("en-IN")}`} />
                      <MiniInfo label="Next Due" value={formatPaymentDate(tenant.nextDueDate)} />
                    </div>
                  </Link>
                  <ActionButton
                    tone={status.tone}
                    isPaid={isPaid}
                    onClick={() => openPayment(tenant)}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Desktop view ── */}
      <section className="hidden space-y-4 lg:block">
        <div className={`${ownerHeroCardClass} px-4 py-4 sm:px-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--fg-secondary)]">Tenants</p>
              <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.55rem]">Tenant Directory</h1>
              <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">Showing tenants for {currentHostel.hostelName} only.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-11 min-w-[164px] items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-5 py-2.5 text-[12px] font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)]"
            >
              Add New Tenant
            </button>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={UserRound} label="Total Tenants" value={String(filteredTenants.length)} />
          <SummaryTile icon={Wallet} label="Due Soon" value={String(dueSoonCount)} tone="warning" />
          <SummaryTile icon={Wallet} label="Overdue" value={String(overdueCount)} tone="danger" />
          <SummaryTile icon={UserCheck} label="Assigned" value={String(assignedCount)} tone="success" />
        </div>

        <Card className={`rounded-[10px] ${ownerPanelClass}`}>
          {/* Search bar */}
          <div className="border-b border-[color:var(--border)] px-4 py-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, room, contact…"
                className="w-full rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2.5 pl-9 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          {/* Table — horizontal scroll only, page handles vertical */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className={ownerTableHeadClass}>
                <tr>
                  <th className="px-3 py-2.5 font-medium">Tenant ID</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Contact</th>
                  <th className="px-3 py-2.5 font-medium">Room</th>
                  <th className="px-3 py-2.5 font-medium">Monthly Rent</th>
                  <th className="px-3 py-2.5 font-medium">Next Due</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-7 text-center text-sm text-[color:var(--fg-secondary)]">
                      {searchQuery ? "No tenants matched that search." : "No tenants created yet for this hostel."}
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const status = getDueStatus(tenant.nextDueDate);
                    const isPaid = status.tone !== "red" && status.tone !== "orange" && status.tone !== "yellow";

                    return (
                      <tr key={tenant.tenantId} className="border-t border-[color:var(--border)] transition hover:bg-white/[0.02]">
                        <td className="px-3 py-3 font-semibold text-[color:var(--fg-secondary)]">{tenant.tenantId}</td>
                        <td className="px-3 py-3">
                          <Link href={`/owner/tenants/${tenant.tenantId}`} className="font-medium text-white transition hover:text-[var(--accent-electric)]">
                            {tenant.fullName}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-[color:var(--fg-primary)]">{tenant.phone}</p>
                          <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{tenant.email}</p>
                        </td>
                        <td className="px-3 py-3 text-[color:var(--fg-primary)]">
                          {tenant.assignment ? `Floor ${tenant.assignment.floorNumber} / Room ${tenant.assignment.roomNumber}` : "Pending"}
                        </td>
                        <td className="px-3 py-3 text-[color:var(--fg-primary)]">Rs {tenant.monthlyRent.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-3 text-[color:var(--fg-primary)]">{formatPaymentDate(tenant.nextDueDate)}</td>
                        <td className="px-3 py-3">
                          <ActionButton
                            tone={status.tone}
                            isPaid={isPaid}
                            onClick={() => openPayment(tenant)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Modals */}
      <TenantFormModal
        open={modalOpen}
        onClose={closeModal}
        hostelId={currentHostel.id}
        propertyType={currentHostel.type}
        onCreated={async (tenant) => {
          if (shouldAutoAssign) {
            const { hostelId, floorNumber, roomNumber, sharingType } = preferredAssignment as {
              hostelId: string; floorNumber: number; roomNumber: string; sharingType: string;
            };

            const { response, data } = await assignTenantRoom({
              tenantId: tenant.tenantId,
              hostelId,
              floorNumber,
              roomNumber,
              sharingType,
              moveInDate: tenant.paidOnDate,
            });

            if (response.ok) {
              const assigned = data.tenant as TenantRecord | undefined;
              if (!assigned) { closeModal(); return; }
              setCreatedTenants((prev) => [assigned, ...prev.filter((t) => t.tenantId !== assigned.tenantId)]);
              setTenantOverrides((prev) => ({ ...prev, [assigned.tenantId]: assigned }));
              setPendingTenant(assigned);
              closeModal();
              return;
            }
          }

          setCreatedTenants((prev) => [tenant, ...prev.filter((t) => t.tenantId !== tenant.tenantId)]);
          setPendingTenant(tenant);
          setAssignmentOpen(true);
          closeModal();
        }}
      />

      <TenantRoomAssignmentModal
        open={assignmentOpen}
        tenant={pendingTenant}
        onClose={() => setAssignmentOpen(false)}
        onAssigned={(tenant) => {
          setCreatedTenants((prev) => [tenant, ...prev.filter((t) => t.tenantId !== tenant.tenantId)]);
          setTenantOverrides((prev) => ({ ...prev, [tenant.tenantId]: tenant }));
          setPendingTenant(tenant);
          setAssignmentOpen(false);
        }}
        preferredAssignment={preferredAssignment}
      />

      <PaymentCollectionModal
        open={!!paymentTenant}
        tenant={paymentTenant}
        onClose={() => setPaymentTenant(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

// ── Action button ──────────────────────────────────────────────────────────

function ActionButton({
  tone,
  isPaid,
  onClick,
}: {
  tone: string;
  isPaid: boolean;
  onClick: () => void;
}) {
  if (isPaid) {
    return (
      <span className="inline-flex h-8 items-center rounded-xl border border-[#4ade80]/40 bg-[#22c55e]/10 px-3 text-[11px] font-semibold text-[#4ade80]">
        Paid
      </span>
    );
  }

  const isOverdue = tone === "red";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-xl px-3 text-[11px] font-semibold transition hover:brightness-110 active:scale-95 ${
        isOverdue
          ? "border border-[#ef4444]/50 bg-[#dc2626]/15 text-[#ff7070] hover:bg-[#dc2626]/25"
          : "border border-[#facc15]/50 bg-[#facc15]/10 text-[#fde047] hover:bg-[#facc15]/20"
      }`}
    >
      {isOverdue ? "Pay Now" : "Collect Rent"}
    </button>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <Card className={`rounded-[8px] border p-3 ${ownerMetricToneClass(tone)}`}>
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-black/10 p-2 ring-1 ring-white/8">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
          <p className="mt-1 text-[1.15rem] font-semibold leading-none">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-2xl px-2.5 py-2 ${ownerSubtlePanelClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <SkeletonBlock className="h-24 rounded-[10px]" />

      {/* Stat cards skeleton */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-[10px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(30,41,59,0.94)_0%,rgba(15,23,42,0.98)_100%)]">
        {/* Search bar skeleton */}
        <div className="border-b border-white/[0.06] px-4 py-3">
          <SkeletonBlock className="h-10 w-64 rounded-2xl" />
        </div>

        {/* Table rows */}
        <div className="hidden lg:block">
          <table className="min-w-full">
            <thead>
              <tr className="bg-white/[0.03]">
                {["Tenant ID", "Name", "Contact", "Room", "Monthly Rent", "Next Due", "Action"].map((col) => (
                  <th key={col} className="px-3 py-2.5 text-left">
                    <SkeletonBlock className="h-3 w-16 rounded-full" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile skeleton rows */}
        <div className="space-y-2.5 p-4 lg:hidden">
          <ProcessingPill label="Preparing tenant directory" />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-[8px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
