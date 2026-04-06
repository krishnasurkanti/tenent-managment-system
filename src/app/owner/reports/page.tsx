import { Card } from "@/components/ui/card";

export default function OwnerReportsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-5 py-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Reports</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-800">Reports Center</h1>
        <p className="mt-2 text-sm text-slate-500">Export-friendly cards with the same polished control language used across the dashboard.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["Occupancy Report", "Tenant Report", "Payment Report"].map((item) => (
          <Card key={item} className="p-6">
            <h2 className="text-xl font-semibold text-slate-800">{item}</h2>
            <p className="mt-2 text-sm text-slate-500">View and export structured data for this report type.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
