import { Building2, MapPin } from "lucide-react";
import { getOwnerHostel } from "@/data/ownerHostelStore";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { ownerPanelClass } from "@/components/ui/owner-theme";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const session = await getOwnerSession();
  let hostel = null;

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels");
    const payload = (await backendResponse.json()) as { hostels?: Array<{
      id: string;
      hostelName: string;
      address: string;
      floors: Array<{ rooms: unknown[] }>;
    }> };
    hostel = Array.isArray(payload.hostels) ? payload.hostels[0] ?? null : null;
  } else {
    hostel = getOwnerHostel();
  }

  const totalRooms = hostel?.floors.reduce((sum, floor) => sum + floor.rooms.length, 0) ?? 0;

  return (
    <div className="space-y-3">
      <OwnerPageHero
        eyebrow="Settings"
        title="Hostel settings"
        description="Review your active hostel profile, operational defaults, and the owner setup used across the app."
        badge={<span className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">{hostel ? "Profile ready" : "No hostel yet"}</span>}
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        <OwnerQuickStat label="Rooms" value={String(totalRooms)} helper="Current total inventory" />
        <OwnerQuickStat label="Profile" value={hostel ? "Ready" : "Empty"} helper="Owner-facing setup state" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <InfoTile icon={Building2} label="Hostel Name" value={hostel?.hostelName ?? "Not created yet"} />
        <InfoTile icon={MapPin} label="Address" value={hostel?.address ?? "Not created yet"} />
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className={`rounded-[8px] p-3 ${ownerPanelClass}`}>
      <div className="flex items-center gap-2.5">
        <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}
