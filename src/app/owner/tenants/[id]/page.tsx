import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, IdCard, Phone, User2 } from "lucide-react";
import { getTenantRecordById } from "@/data/tenantStore";
import { Card } from "@/components/ui/card";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";

export const dynamic = "force-dynamic";

export default async function OwnerTenantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = getTenantRecordById(id);

  if (!tenant) {
    notFound();
  }

  const currentStatus = getDueStatus(tenant.nextDueDate);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff4fb_0%,#f8fafc_38%,#ffffff_100%)] px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Link href="/owner/payments" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to payments
        </Link>

        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_70px_rgba(148,163,184,0.18)] md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Tenant Profile</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-800">{tenant.fullName}</h1>
              <p className="mt-2 text-base text-slate-500">Unique Tenant ID: {tenant.tenantId}</p>
            </div>
            <span className={getStatusClassName(currentStatus.tone)}>{currentStatus.label}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold text-slate-800">Personal Details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard icon={User2} label="Full Name" value={tenant.fullName} />
              <InfoCard icon={Phone} label="Phone" value={tenant.phone} />
              <InfoCard icon={IdCard} label="Email" value={tenant.email} />
              <InfoCard icon={IdCard} label="ID Number" value={tenant.idNumber} />
              <InfoCard icon={Phone} label="Emergency Contact" value={tenant.emergencyContact} />
              <InfoCard icon={CalendarDays} label="Joined On" value={formatPaymentDate(tenant.createdAt.slice(0, 10))} />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold text-slate-800">Stay Details</h2>
            <div className="mt-5 space-y-4">
              <DetailRow label="Hostel" value={tenant.assignment?.hostelName ?? "Not assigned"} />
              <DetailRow label="Floor" value={tenant.assignment ? `Floor ${tenant.assignment.floorNumber}` : "Not assigned"} />
              <DetailRow label="Room" value={tenant.assignment?.roomNumber ?? "Not assigned"} />
              <DetailRow label="Sharing Type" value={tenant.assignment?.sharingType ?? "Not assigned"} />
              <DetailRow label="Move In Date" value={tenant.assignment?.moveInDate ? formatPaymentDate(tenant.assignment.moveInDate) : "Not assigned"} />
              <DetailRow label="ID Image" value={tenant.idImageName} />
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold text-slate-800">Payment History</h2>
            <p className="mt-1 text-sm text-slate-500">All rent cycle records linked to this tenant ID, room, floor, and contact details.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Payment ID</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Paid On</th>
                  <th className="px-6 py-4 font-medium">Next Due</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenant.paymentHistory.map((payment) => (
                  <tr key={payment.paymentId} className="border-t border-slate-200">
                    <td className="px-6 py-5 font-medium text-slate-700">{payment.paymentId}</td>
                    <td className="px-6 py-5">₹{payment.amount.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-5">{formatPaymentDate(payment.paidOnDate)}</td>
                    <td className="px-6 py-5">{formatPaymentDate(payment.nextDueDate)}</td>
                    <td className="px-6 py-5">
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
    </main>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-slate-400" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-right text-slate-700">{value}</span>
    </div>
  );
}

function getStatusClassName(tone: string) {
  if (tone === "red") {
    return "inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600";
  }
  if (tone === "orange") {
    return "inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600";
  }
  if (tone === "yellow") {
    return "inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600";
  }
  return "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600";
}
