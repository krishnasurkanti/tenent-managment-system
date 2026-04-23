import { FileBarChart2 } from "lucide-react";
import { OwnerComingSoon, OwnerPageHero } from "@/components/ui/owner-page";

export default function OwnerReportsPage() {
  return (
    <div className="space-y-4 text-white">
      <OwnerPageHero
        eyebrow="Reports"
        title="Reports centre"
        description="Occupancy, payment collection, and tenant summaries with export-ready owner reporting."
        badge={<span className="inline-flex rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">Planning in progress</span>}
      />

      <OwnerComingSoon
        icon={<FileBarChart2 className="h-6 w-6" />}
        title="Reports are on the way"
        body="Occupancy reports, payment summaries, and CSV or PDF exports will arrive in a dedicated owner reporting release."
      />
    </div>
  );
}
