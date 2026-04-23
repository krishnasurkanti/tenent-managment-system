import { Building2, Layers3, MapPin } from "lucide-react";
import { getOwnerHostel } from "@/data/ownerHostelStore";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { ownerPanelClass, ownerSubtlePanelClass } from "@/components/ui/owner-theme";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

const preferenceCards = [
  { label: "Rent reminder", value: "3 days before due", helper: "SMS + in-app" },
  { label: "Check-in window", value: "8 AM – 8 PM", helper: "Late entry needs approval" },
  { label: "Escalation", value: "Auto after 24h", helper: "High priority → owner first" },
];

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

      <div className="grid gap-2.5 sm:grid-cols-3">
        <OwnerQuickStat label="Floors" value={String(hostel?.floors.length ?? 0)} helper="Configured in hostel setup" />
        <OwnerQuickStat label="Rooms" value={String(totalRooms)} helper="Current total inventory" />
        <OwnerQuickStat label="Profile" value={hostel ? "Ready" : "Empty"} helper="Owner-facing setup state" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <InfoTile icon={Building2} label="Hostel Name" value={hostel?.hostelName ?? "Not created yet"} />
        <InfoTile icon={MapPin} label="Address" value={hostel?.address ?? "Not created yet"} />
        <InfoTile icon={Layers3} label="Total Floors" value={String(hostel?.floors.length ?? 0)} />
      </div>

      <Card className={`rounded-[10px] p-3 ${ownerPanelClass}`}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Demo preferences</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {preferenceCards.map((item) => (
            <div key={item.label} className={`rounded-[8px] px-3 py-2.5 ${ownerSubtlePanelClass}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{item.label}</p>
              <p className="mt-1 text-[13px] font-semibold text-white">{item.value}</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{item.helper}</p>
            </div>
          ))}
        </div>
      </Card>
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
