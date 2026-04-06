"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useHostelContext } from "@/components/hostel-context-provider";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";

export default function OwnerTenantsPage() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();

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

  const tenants = allTenants.filter((tenant) => tenant.assignment?.hostelId === currentHostel.id);

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
          <Link
            href="/tenants"
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-95"
          >
            Add New Tenant
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[linear-gradient(180deg,#f6efff_0%,#fff5fa_100%)] text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium">Tenant ID</th>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Contact</th>
                <th className="px-3 py-2.5 font-medium">Room</th>
                <th className="px-3 py-2.5 font-medium">Monthly Rent</th>
                <th className="px-3 py-2.5 font-medium">Next Due</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-7 text-center text-sm text-slate-500">
                    No tenants created yet for this hostel. Add your first tenant to get started.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.tenantId} className="border-t border-white/80">
                    <td className="px-3 py-3 font-semibold text-slate-700">{tenant.tenantId}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/owner/tenants/${tenant.tenantId}`}
                        className="font-medium text-slate-800 transition hover:text-violet-600"
                      >
                        {tenant.fullName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <p>{tenant.phone}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{tenant.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      {tenant.assignment
                        ? `Floor ${tenant.assignment.floorNumber} / Room ${tenant.assignment.roomNumber}`
                        : "Pending"}
                    </td>
                    <td className="px-3 py-3">₹{tenant.monthlyRent.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3">{tenant.nextDueDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
