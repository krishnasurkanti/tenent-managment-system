"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TenantFormModal } from "@/components/tenant-form-modal";
import { TenantRoomAssignmentModal } from "@/components/tenant-room-assignment-modal";
import { Card } from "@/components/ui/card";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";
import type { TenantRecord } from "@/types/tenant";

export default function OwnerTenantsPage() {
  return (
    <Suspense fallback={<Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading tenants...</Card>}>
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
    return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading tenants...</Card>;
  }

  if (!currentHostel) {
    return (
      <Card className="p-5 text-center">
        <p className="text-sm font-semibold text-slate-800">No hostel selected.</p>
        <Link
          href="/owner/create-hostel"
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-4 text-[12px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-95"
        >
          Create Hostel
        </Link>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Tenants</p>
            <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-slate-800 sm:text-[1.55rem]">
              Tenant Directory
            </h1>
            <p className="mt-1 text-[12px] text-slate-500">Showing tenants for {currentHostel.hostelName} only.</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-11 min-w-[164px] items-center justify-center rounded-2xl border border-indigo-300/40 bg-[linear-gradient(90deg,#7c5cff_0%,#ff7ca8_100%)] px-5 py-2.5 text-[12px] font-semibold text-white shadow-[0_16px_32px_rgba(144,112,255,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(144,112,255,0.28)]"
          >
            Add New Tenant
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <TenantSummaryCard label="Total Tenants" value={String(tenants.length)} helper="Current hostel only" tone="violet" />
        <TenantSummaryCard label="Due Soon" value={String(dueSoonCount)} helper="Needs attention" tone="orange" />
        <TenantSummaryCard label="Overdue" value={String(overdueCount)} helper="Follow up now" tone="rose" />
        <TenantSummaryCard label="Assigned" value={String(assignedCount)} helper="Rooms occupied" tone="sky" />
      </div>

      <Card className="hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[linear-gradient(180deg,#eef2ff_0%,#fdf2f8_100%)] text-slate-500">
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
                    No tenants created yet for this hostel. Add your first tenant to get started.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => {
                  const status = getDueStatus(tenant.nextDueDate);

                  return (
                    <tr key={tenant.tenantId} className="border-t border-white/80">
                      <td className="px-3 py-3 font-semibold text-slate-700">{tenant.tenantId}</td>
                      <td className="px-3 py-3">
                        <Link href={`/owner/tenants/${tenant.tenantId}`} className="font-medium text-slate-800 transition hover:text-indigo-600">
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
                        <span className={getTenantStatusClassName(status.tone)}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-2.5 lg:hidden">
        {tenants.length === 0 ? (
          <Card className="p-4 text-center text-sm text-slate-500">
            No tenants created yet for this hostel. Add your first tenant to get started.
          </Card>
        ) : (
          tenants.map((tenant) => {
            const status = getDueStatus(tenant.nextDueDate);

            return (
              <Card key={tenant.tenantId} className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.96)_100%)] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/owner/tenants/${tenant.tenantId}`} className="text-[13px] font-semibold text-slate-800 hover:text-indigo-600">
                      {tenant.fullName}
                    </Link>
                    <p className="mt-1 text-[11px] text-slate-500">{tenant.tenantId} | {tenant.phone}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {tenant.assignment ? `Floor ${tenant.assignment.floorNumber} / Room ${tenant.assignment.roomNumber}` : "Pending assignment"}
                    </p>
                  </div>
                  <span className={getTenantStatusClassName(status.tone)}>{status.label}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <TenantMiniInfo label="Rent" value={`Rs ${tenant.monthlyRent.toLocaleString("en-IN")}`} />
                  <TenantMiniInfo label="Next Due" value={formatPaymentDate(tenant.nextDueDate)} />
                </div>
              </Card>
            );
          })
        )}
      </div>

      <TenantFormModal
        open={modalOpen}
        onClose={closeModal}
        onCreated={async (tenant) => {
          if (shouldAutoAssign) {
            const response = await fetch("/api/tenants/assign-room", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
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

function TenantSummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "violet" | "orange" | "rose" | "sky";
}) {
  const toneClass =
    tone === "violet"
      ? "bg-[linear-gradient(180deg,#eef2ff_0%,#e0e7ff_100%)] text-indigo-700"
      : tone === "orange"
        ? "bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)] text-orange-700"
        : tone === "rose"
          ? "bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] text-rose-700"
          : "bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] text-sky-700";

  return (
    <Card className={`border-white/70 p-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.2rem] font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] opacity-80">{helper}</p>
    </Card>
  );
}

function TenantMiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] px-3 py-2 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-[12px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function getTenantStatusClassName(tone: string) {
  if (tone === "red") return "inline-flex rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-semibold text-rose-700";
  if (tone === "orange" || tone === "yellow") return "inline-flex rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-semibold text-orange-700";
  return "inline-flex rounded-full bg-[var(--success-soft)] px-2 py-1 text-[10px] font-semibold text-emerald-700";
}
