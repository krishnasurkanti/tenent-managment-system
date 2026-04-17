import { FileBarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function OwnerReportsPage() {
  return (
    <div className="space-y-4 text-white">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_28%),linear-gradient(180deg,#0f1425_0%,#0b101c_100%)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Reports</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-[2.5rem]">Reports centre</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--fg-secondary)]">
          Occupancy, payment collection, and tenant summaries — exportable as PDF or CSV.
        </p>
      </Card>

      <Card className="flex flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-12 text-center text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
          <FileBarChart2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Coming soon</p>
          <p className="mt-1 max-w-sm text-sm text-[color:var(--fg-secondary)]">
            Occupancy reports, payment summaries, and CSV/PDF exports will be available in an upcoming release.
          </p>
        </div>
      </Card>
    </div>
  );
}
