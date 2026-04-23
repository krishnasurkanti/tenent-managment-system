import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, IdCard, Mail, Phone, User2, Users2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { getTenantRecords } from "@/data/tenantStore";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

export const dynamic = "force-dynamic";

export default async function OwnerTenantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getOwnerSession();

  if (session.mode === "guest") notFound();

  let tenant: TenantRecord | undefined;

  if (session.isLive) {
    // Call the backend directly — never build URLs from user-supplied headers
    const backendResponse = await backendFetch(`/api/tenants/${encodeURIComponent(id)}`);
    if (!backendResponse.ok) notFound();
    const payload = (await backendResponse.json()) as { tenant?: TenantRecord };
    tenant = payload.tenant;
  } else {
    const allTenants = getTenantRecords();
    tenant = allTenants.find((t) => t.tenantId === id);
  }

  if (!tenant) notFound();

  const currentStatus = getDueStatus(tenant.nextDueDate);

  return (
    <div className="text-white">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Link
          href="/owner/tenants"
          className="inline-flex items-center gap-2 rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2.5 text-sm font-medium text-[color:var(--fg-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </Link>

        <OwnerPageHero
          eyebrow="Tenant profile"
          title={tenant.fullName}
          description="Identity details, room assignment, family information, and complete payment history for this tenant."
          badge={<span className={getStatusClassName(currentStatus.tone)}>{currentStatus.label}</span>}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <OwnerQuickStat label="Rent" value={`Rs ${tenant.monthlyRent.toLocaleString("en-IN")}`} helper="Current monthly amount" />
          <OwnerQuickStat label="Last paid" value={formatPaymentDate(tenant.paidOnDate)} helper="Most recent payment date" />
          <OwnerQuickStat label="Next due" value={formatPaymentDate(tenant.nextDueDate)} helper={`Tenant ID ${tenant.tenantId}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
            <h2 className="text-base font-semibold text-white">Personal details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoCard icon={User2} label="Full Name" value={tenant.fullName} />
              <InfoCard icon={Phone} label="Phone" value={tenant.phone} />
              <InfoCard icon={Mail} label="Email" value={tenant.email} />
              <InfoCard icon={IdCard} label="ID Number" value={tenant.idNumber} />
              <InfoCard icon={Phone} label="Emergency Contact" value={tenant.emergencyContact} />
              <InfoCard icon={CalendarDays} label="Joined On" value={formatPaymentDate(tenant.createdAt.slice(0, 10))} />
            </div>
          </Card>

          <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
            <h2 className="text-base font-semibold text-white">Stay details</h2>
            <div className="mt-4 space-y-3">
              <DetailRow label="Hostel" value={tenant.assignment?.hostelName ?? "Not assigned"} />
              <DetailRow label="Floor" value={tenant.assignment ? `Floor ${tenant.assignment.floorNumber}` : "Not assigned"} />
              <DetailRow label="Room" value={tenant.assignment?.roomNumber ?? "Not assigned"} />
              <DetailRow label="Sharing Type" value={tenant.assignment?.sharingType ?? "Not assigned"} />
              <DetailRow label="Move In Date" value={tenant.assignment?.moveInDate ? formatPaymentDate(tenant.assignment.moveInDate) : "Not assigned"} />
              <DetailRow label="ID Image" value={tenant.idImageName} />
            </div>
          </Card>
        </div>

        {tenant.familyMembers && tenant.familyMembers.length > 0 ? (
          <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
            <h2 className="text-base font-semibold text-white">Family members</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tenant.familyMembers.map((member, index) => (
                <InfoCard
                  key={`${member.name}-${member.relation}-${index}`}
                  icon={Users2}
                  label={`${member.relation}${member.age !== undefined ? ` • ${member.age} yrs` : ""}`}
                  value={member.name}
                />
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="overflow-hidden bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] text-white">
          <div className="border-b border-[color:var(--border)] px-4 py-4">
            <h2 className="text-base font-semibold text-white">Payment history</h2>
            <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">All rent cycles linked to this tenant.</p>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {tenant.paymentHistory.map((payment) => (
              <div key={payment.paymentId} className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{payment.paymentId}</p>
                    <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">
                      Paid {formatPaymentDate(payment.paidOnDate)} / Next {formatPaymentDate(payment.nextDueDate)}
                    </p>
                  </div>
                  <span className={getStatusClassName(payment.status === "active" ? "green" : payment.status === "due-soon" ? "orange" : "red")}>
                    {payment.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">Rs {payment.amount.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color:var(--surface-soft)] text-[color:var(--fg-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Paid On</th>
                  <th className="px-4 py-3 font-medium">Next Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenant.paymentHistory.map((payment) => (
                  <tr key={payment.paymentId} className="border-t border-[color:var(--border)] text-white">
                    <td className="px-4 py-4 font-medium">{payment.paymentId}</td>
                    <td className="px-4 py-4">Rs {payment.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-4 text-[color:var(--fg-secondary)]">{formatPaymentDate(payment.paidOnDate)}</td>
                    <td className="px-4 py-4 text-[color:var(--fg-secondary)]">{formatPaymentDate(payment.nextDueDate)}</td>
                    <td className="px-4 py-4">
                      <span className={getStatusClassName(payment.status === "active" ? "green" : payment.status === "due-soon" ? "orange" : "red")}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
      <Icon className="h-4 w-4 text-[color:var(--accent)]" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
      <span className="text-sm text-[color:var(--fg-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-right text-white">{value}</span>
    </div>
  );
}

function getStatusClassName(tone: string) {
  if (tone === "red") {
    return "inline-flex rounded-full border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_12px_24px_rgba(220,38,38,0.24)]";
  }
  if (tone === "orange" || tone === "yellow") {
    return "inline-flex rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#422006] shadow-[0_12px_24px_rgba(250,204,21,0.24)]";
  }
  return "inline-flex rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]";
}
