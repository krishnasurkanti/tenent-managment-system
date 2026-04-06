"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { TenantFormModal } from "@/components/tenant-form-modal";
import { TenantRoomAssignmentModal } from "@/components/tenant-room-assignment-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import type { TenantRecord } from "@/types/tenant";

function getPreferredAssignmentFromSearch() {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    action: params.get("action") ?? undefined,
    hostelId: params.get("hostelId") ?? undefined,
    floorNumber: params.get("floor") ? Number(params.get("floor")) : undefined,
    roomNumber: params.get("room") ?? undefined,
    sharingType: params.get("sharingType") ?? undefined,
  };
}

export default function TenantsPage() {
  const [modalOpen, setModalOpen] = useState(() => getPreferredAssignmentFromSearch().action === "add-tenant");
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [pendingTenant, setPendingTenant] = useState<TenantRecord | null>(null);
  const [preferredAssignment] = useState<{
    action?: string;
    hostelId?: string;
    floorNumber?: number;
    roomNumber?: string;
    sharingType?: string;
  }>(() => getPreferredAssignmentFromSearch());
  const shouldAutoAssign =
    preferredAssignment.action === "add-tenant" &&
    !!preferredAssignment.hostelId &&
    !!preferredAssignment.floorNumber &&
    !!preferredAssignment.roomNumber &&
    !!preferredAssignment.sharingType;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Tenant registry"
        title="Tenants"
        description="Create a tenant profile, upload ID details, capture emergency contact information, and assign a memorable 5-digit tenant ID."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        }
      />

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--muted)] p-3">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">What happens on Add Tenant</h2>
            <p className="text-sm text-[var(--muted-foreground)]">First we collect full name, phone, email, ID image, ID number, and emergency contact. After submit, the backend uses the last 5 digits of the phone number as the tenant ID when possible. If that ID already exists, it creates a different unique 5-digit ID. Immediately after that, we ask for hostel, floor, and room assignment using room data created by the hostel setup.</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Created tenants</h2>
        </div>
        {tenants.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--muted-foreground)]">
            No tenant has been created yet. Press <span className="font-semibold text-[var(--foreground)]">Add Tenant</span> to create the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Tenant ID</th>
                  <th className="px-6 py-4 font-medium">Full Name</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Monthly Rent</th>
                  <th className="px-6 py-4 font-medium">Rent Paid</th>
                  <th className="px-6 py-4 font-medium">Payment Cycle</th>
                  <th className="px-6 py-4 font-medium">ID Details</th>
                  <th className="px-6 py-4 font-medium">Assignment</th>
                  <th className="px-6 py-4 font-medium">Emergency Contact</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.tenantId} className="border-t border-[var(--border)]">
                    <td className="px-6 py-5">
                      <Badge variant="info">{tenant.tenantId}</Badge>
                    </td>
                    <td className="px-6 py-5 font-medium">
                      <Link href={`/owner/tenants/${tenant.tenantId}`} className="transition hover:text-[var(--accent)]">
                        {tenant.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <p>{tenant.phone}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{tenant.email}</p>
                    </td>
                    <td className="px-6 py-5 font-medium">₹{tenant.monthlyRent.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-5 font-medium">₹{tenant.rentPaid.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium">Paid: {tenant.paidOnDate}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Next Due: {tenant.nextDueDate}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p>{tenant.idNumber}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{tenant.idImageName}</p>
                    </td>
                    <td className="px-6 py-5">
                      {tenant.assignment ? (
                        <>
                          <p>{tenant.assignment.hostelName}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Floor {tenant.assignment.floorNumber} • Room {tenant.assignment.roomNumber}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {tenant.assignment.sharingType} • Move in {tenant.assignment.moveInDate}
                          </p>
                        </>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">Pending assignment</span>
                      )}
                    </td>
                    <td className="px-6 py-5">{tenant.emergencyContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TenantFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
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
              setTenants((current) => [data.tenant as TenantRecord, ...current]);
              setPendingTenant(data.tenant as TenantRecord);
              return;
            }
          }

          setTenants((current) => [tenant, ...current]);
          setPendingTenant(tenant);
          setAssignmentOpen(true);
        }}
      />
      <TenantRoomAssignmentModal
        open={assignmentOpen}
        tenant={pendingTenant}
        onClose={() => setAssignmentOpen(false)}
        onAssigned={(tenant) => {
          setTenants((current) => current.map((item) => (item.tenantId === tenant.tenantId ? tenant : item)));
          setPendingTenant(tenant);
        }}
        preferredAssignment={preferredAssignment}
      />
    </div>
  );
}
