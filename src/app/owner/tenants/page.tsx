"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, UserCheck, UserRound, Wallet } from "lucide-react";
import { TenantFormModal } from "@/components/tenant-form-modal";
import { TenantRoomAssignmentModal } from "@/components/tenant-room-assignment-modal";
import { Card } from "@/components/ui/card";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";
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
        <p className="text-sm font-semibold text-slate-800">No hostel selected.</p>
        <Link
          href="/owner/create-hostel"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-4 text-sm font-semibold text-white"
        >
          Create Hostel
        </Link>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="space-y-3 lg:hidden">
        <Card className="rounded-[24px] border-slate-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tenant hub</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">Tenants</h1>
              <p className="mt-1 text-xs text-slate-500">{currentHostel.hostelName}</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-3 text-sm font-semibold text-white"
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
            <Card className="rounded-[24px] border-slate-100 p-4 text-center text-sm text-slate-500">
              No tenants yet for this hostel.
            </Card>
          ) : (
            tenants.map((tenant) => {
              const status = getDueStatus(tenant.nextDueDate);

              return (
                <Link
                  key={tenant.tenantId}
                  href={`/owner/tenants/${tenant.tenantId}`}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-[22px] border border-slate-100 bg-white px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{tenant.fullName}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        #{tenant.tenantId}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {tenant.assignment ? `F${tenant.assignment.floorNumber} • R${tenant.assignment.roomNumber}` : "Pending assignment"} • {tenant.phone}
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
        <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Tenants</p>
              <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-slate-800 sm:text-[1.55rem]">Tenant Directory</h1>
              <p className="mt-1 text-[12px] text-slate-500">Showing tenants for {currentHostel.hostelName} only.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-11 min-w-[164px] items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-5 py-2.5 text-[12px] font-semibold text-white shadow-[var(--shadow-soft)]"
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

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-slate-50 text-slate-500">
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
                    <td colSpan={7} className="px-3 py-7 text-center text-sm text-slate-500">
                      No tenants created yet for this hostel.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const status = getDueStatus(tenant.nextDueDate);

                    return (
                      <tr key={tenant.tenantId} className="border-t border-white/80">
                        <td className="px-3 py-3 font-semibold text-slate-700">{tenant.tenantId}</td>
                        <td className="px-3 py-3">
                          <Link href={`/owner/tenants/${tenant.tenantId}`} className="font-medium text-slate-800 transition hover:text-[var(--accent)]">
                            {tenant.fullName}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <p>{tenant.phone}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{tenant.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          {tenant.assignment ? `Floor ${tenant.assignment.floorNumber} / Room ${tenant.assignment.roomNumber}` : "Pending"}
                        </td>
                        <td className="px-3 py-3">Rs {tenant.monthlyRent.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-3">{formatPaymentDate(tenant.nextDueDate)}</td>
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
            const response = await fetch("/api/tenants/assign-room", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenantId: tenant.tenantId,
                hostelId: preferredAssignment.hostelId,
                floorNumber: preferredAssignment.floorNumber,
                roomNumber: preferredAssignment.roomNumber,
                sharingType: preferredAssignment.sharingType,
                moveInDate: tenant.paidOnDate,
              }),
            });

            const data = await response.json();

            if (response.ok) {
              setCreatedTenants((current) => {
                const nextTenant = data.tenant as TenantRecord;
                const filtered = current.filter((item) => item.tenantId !== nextTenant.tenantId);
                return [nextTenant, ...filtered];
              });
              setTenantOverrides((current) => ({
                ...current,
                [data.tenant.tenantId]: data.tenant as TenantRecord,
              }));
              setPendingTenant(data.tenant as TenantRecord);
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
  const toneClass =
    tone === "warning"
      ? "bg-[var(--warning-soft)] text-amber-700"
      : tone === "danger"
        ? "bg-[var(--danger-soft)] text-rose-700"
        : tone === "success"
          ? "bg-[var(--success-soft)] text-emerald-700"
          : "bg-[var(--pill-gradient)] text-[var(--accent)]";

  return (
    <Card className={`rounded-[20px] border-slate-100 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ${toneClass}`}>
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">
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
    <div className="rounded-2xl bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-36 animate-pulse rounded-[24px] bg-slate-100" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-[20px] bg-slate-100" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function statusClass(tone: string) {
  if (tone === "red") return "inline-flex h-fit rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-semibold text-rose-700";
  if (tone === "orange" || tone === "yellow") {
    return "inline-flex h-fit rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-semibold text-amber-700";
  }
  return "inline-flex h-fit rounded-full bg-[var(--success-soft)] px-2 py-1 text-[10px] font-semibold text-emerald-700";
}
