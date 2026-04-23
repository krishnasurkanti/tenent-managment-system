import { Wrench } from "lucide-react";
import { OwnerComingSoon, OwnerPageHero } from "@/components/ui/owner-page";

export default function OwnerComplaintsPage() {
  return (
    <div className="space-y-4 text-white">
      <OwnerPageHero
        eyebrow="Complaints"
        title="Complaint register"
        description="Track maintenance issues and tenant complaints in one queue with severity, ownership, and follow-up visibility."
        badge={<span className="inline-flex rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-3 py-1 text-[11px] font-semibold text-amber-300">Owner workflow planned</span>}
      />

      <OwnerComingSoon
        icon={<Wrench className="h-6 w-6" />}
        title="Complaint tracking is coming soon"
        body="Maintenance requests, complaint resolution flows, and owner follow-up tracking will be added in an upcoming release."
      />
    </div>
  );
}
