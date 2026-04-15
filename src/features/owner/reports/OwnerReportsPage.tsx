import { Download, FileBarChart2, Hotel, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reports = [
  {
    title: "Occupancy Report",
    description: "Room, bed, and vacancy summaries.",
    icon: Hotel,
    period: "April 2026",
    stat: "92% occupied",
    note: "58 of 63 beds filled across 3 floors",
  },
  {
    title: "Tenant Report",
    description: "Tenant roster and assignment breakdown.",
    icon: FileBarChart2,
    period: "Live snapshot",
    stat: "41 active tenants",
    note: "5 check-ins this week, 2 pending room assignments",
  },
  {
    title: "Payment Report",
    description: "Payment collection and due status summary.",
    icon: Wallet,
    period: "April 2026",
    stat: "Rs 3,48,500 collected",
    note: "6 due soon, 3 overdue, 87% paid on time",
  },
];

const recentExports = [
  { name: "April occupancy summary", format: "PDF", generatedAt: "Today, 9:20 AM" },
  { name: "Tenant room allocation", format: "CSV", generatedAt: "Yesterday, 6:40 PM" },
  { name: "Collections vs dues", format: "XLSX", generatedAt: "Yesterday, 11:15 AM" },
];

export default function OwnerReportsPage() {
  return (
    <div className="space-y-4 text-white">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_28%),linear-gradient(180deg,#0f1425_0%,#0b101c_100%)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Reports</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-[2.5rem]">Reports center</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--fg-secondary)]">
          Reporting now follows the darker premium shell so exports, summaries, and stat previews feel like part of the same system.
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.title} className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-[24px] bg-[color:var(--brand-soft)] p-3 text-[color:var(--accent-electric)]">
                  <report.icon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{report.title}</h2>
                  <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">{report.description}</p>
                </div>
              </div>
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">
                {report.period}
              </span>
            </div>
            <div className="mt-5 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Preview stat</p>
              <p className="mt-2 text-lg font-semibold text-white">{report.stat}</p>
              <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">{report.note}</p>
            </div>
            <Button variant="secondary" className="mt-4 min-h-11 w-full bg-[color:var(--surface-soft)] text-white hover:bg-[color:var(--surface-strong)]">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </Card>
        ))}
      </div>

      <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Recent exports</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Mock export activity</h2>
          </div>
          <div className="rounded-[24px] bg-[color:var(--brand-soft)] p-3 text-[color:var(--accent-electric)]">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {recentExports.map((item) => (
            <div key={item.name} className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4">
              <p className="text-sm font-semibold text-white">{item.name}</p>
              <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">{item.generatedAt}</p>
              <span className="mt-3 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">
                {item.format}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
