import { Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function OwnerComplaintsPage() {
  return (
    <div className="space-y-4 text-white">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,#0f1425_0%,#0b101c_100%)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Complaints</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-[2.5rem]">Complaint register</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--fg-secondary)]">
          Track and manage maintenance requests and tenant complaints in one place.
        </p>
      </Card>

      <Card className="flex flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-12 text-center text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
          <Wrench className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Coming soon</p>
          <p className="mt-1 max-w-sm text-sm text-[color:var(--fg-secondary)]">
            Complaint tracking and maintenance request management will be available in an upcoming release.
          </p>
        </div>
      </Card>
    </div>
  );
}
