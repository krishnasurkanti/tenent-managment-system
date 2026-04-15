"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, UserCheck, UserRound, Wallet } from "lucide-react";
import { TenantFormModal } from "@/features/tenants/components/TenantFormModal";
import { TenantRoomAssignmentModal } from "@/features/tenants/components/TenantRoomAssignmentModal";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { assignTenantRoom } from "@/services/tenants/tenants.service";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import {
  ownerHeroCardClass,
  ownerMetricToneClass,
  ownerPanelClass,
  ownerStatusClass,
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
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();
  const [createdTenants, setCreatedTenants] = useState<TenantRecord[]>([]);
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, TenantRecord>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [pendingTenant, setPendingTenant] = useState<TenantRecord | null>(null);

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

  const closeModal = () => {
    setModalOpen(false);
    router.replace("/owner/tenants");
  };

  const tenants = useMemo(() => {
    if (!currentHostel) {
      return [];
    }

    const visibleTenantIds = new Set<string>();
    const scopedExistingTenants = allTenants
      .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
      .map((tenant) => {
        visibleTenantIds.add(tenant.tenantId);
        return tenantOverrides[tenant.tenantId] ?? tenant;
      });

    const scopedCreatedTenants = createdTenants.filter((tenant) => {
      if (visibleTenantIds.has(tenant.tenantId)) {
        return false;
      }

      return tenant.assignment?.hostelId === currentHostel.id || !tenant.assignment;
    });

    return [...scopedCreatedTenants, ...scopedExistingTenants];
  }, [allTenants, createdTenants, currentHostel, tenantOverrides]);

  const dueSoonCount = tenants.filter((tenant) => {
    const tone = getDueStatus(tenant.nextDueDate).tone;
    return tone === "orange" || tone === "yellow";
  }).length;
  const overdueCount = tenants.filter((tenant) => getDueStatus(tenant.nextDueDate).tone === "red").length;
  const assignedCount = tenants.filter((tenant) => tenant.assignment).length;

  if (hostelLoading || tenantLoading) {
    return <LoadingState />;
  }

  if (!currentHostel) {
    return (
      <Card className="rounded-[24px] p-5 text-center">
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
      <section className="space-y-3 lg:hidden">
        <Card className={`${ownerHeroCardClass} rounded-[24px] p-4`}>
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

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <SummaryTile icon={UserRound} label="Total" value={String(tenants.length)} />
            <SummaryTile icon={Wallet} label="Due soon" value={String(dueSoonCount)} tone="warning" />
            <SummaryTile icon={Wallet} label="Overdue" value={String(overdueCount)} tone="danger" />
            <SummaryTile icon={UserCheck} label="Assigned" value={String(assignedCount)} tone="success" />
          </div>
        </Card>

        <div className="space-y-2.5">
          {tenants.length === 0 ? (
            <Card className={`${ownerPanelClass} rounded-[24px] p-4 text-center text-sm text-[color:var(--fg-secondary)]`}>
              No tenants yet for this hostel.
            </Card>
          ) : (
            tenants.map((tenant) => {
              const status = getDueStatus(tenant.nextDueDate);

              return (
                <Link
                  key={tenant.tenantId}
                  href={`/owner/tenants/${tenant.tenantId}`}
                  className={`grid grid-cols-[1fr_auto] gap-3 rounded-[22px] px-3 py-3 ${ownerPanelClass}`}
                >
                  <div className="min-w-0">
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
                  </div>
                  <span className={statusClass(status.tone)}>{status.label}</span>
                </Link>
              );
            })
          )}
        </div>
      </section>

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
          <SummaryTile icon={UserRound} label="Total Tenants" value={String(tenants.length)} />
          <SummaryTile icon={Wallet} label="Due Soon" value={String(dueSoonCount)} tone="warning" />
          <SummaryTile icon={Wallet} label="Overdue" value={String(overdueCount)} tone="danger" />
          <SummaryTile icon={UserCheck} label="Assigned" value={String(assignedCount)} tone="success" />
        </div>

        <Card className={`overflow-hidden ${ownerPanelClass}`}>
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
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-7 text-center text-sm text-[color:var(--fg-secondary)]">
                      No tenants created yet for this hostel.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const status = getDueStatus(tenant.nextDueDate);

                    return (
                      <tr key={tenant.tenantId} className="border-t border-[color:var(--border)]">
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
                          <span className={statusClass(status.tone)}>{status.label}</span>
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

      <TenantFormModal
        open={modalOpen}
        onClose={closeModal}
        onCreated={async (tenant) => {
          if (shouldAutoAssign) {
            const {
              hostelId,
              floorNumber,
              roomNumber,
              sharingType,
            } = preferredAssignment as {
              hostelId: string;
              floorNumber: number;
              roomNumber: string;
              sharingType: string;
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
              const assignedTenant = data.tenant as TenantRecord | undefined;

              if (!assignedTenant) {
                closeModal();
                return;
              }

              setCreatedTenants((current) => {
                const filtered = current.filter((item) => item.tenantId !== assignedTenant.tenantId);
                return [assignedTenant, ...filtered];
              });
              setTenantOverrides((current) => ({
                ...current,
                [assignedTenant.tenantId]: assignedTenant,
              }));
              setPendingTenant(assignedTenant);
              closeModal();
              return;
            }
          }

          setCreatedTenants((current) => {
            const filtered = current.filter((item) => item.tenantId !== tenant.tenantId);
            return [tenant, ...filtered];
          });
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
          setCreatedTenants((current) => {
            const filtered = current.filter((item) => item.tenantId !== tenant.tenantId);
            return [tenant, ...filtered];
          });
          setTenantOverrides((current) => ({
            ...current,
            [tenant.tenantId]: tenant,
          }));
          setPendingTenant(tenant);
          setAssignmentOpen(false);
        }}
        preferredAssignment={preferredAssignment}
      />
    </div>
  );
}

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
  const toneClass = ownerMetricToneClass(tone);

  return (
    <Card className={`rounded-[20px] border p-3 ${toneClass}`}>
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
    <div className="space-y-3">
      <div className={`rounded-[24px] p-4 ${ownerPanelClass}`}>
        <ProcessingPill label="Preparing tenant directory" />
        <SkeletonBlock className="mt-4 h-24 rounded-[20px]" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-20 rounded-[20px]" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-28 rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}

function statusClass(tone: string) {
  return ownerStatusClass(tone);
}
