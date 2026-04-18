import { Building2, Layers3, MapPin } from "lucide-react";
import { getOwnerHostel } from "@/data/ownerHostelStore";
import { Card } from "@/components/ui/card";
import { ownerMetricToneClass, ownerPanelClass, ownerSubtlePanelClass } from "@/components/ui/owner-theme";
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
      {/* Compact hero */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#0b101c_100%)] px-4 py-3">
        <p className="text-sm font-semibold text-white">Settings</p>
        <div className="flex gap-2">
          <MetricTile label="Floors" value={String(hostel?.floors.length ?? 0)} />
          <MetricTile label="Rooms" value={String(totalRooms)} />
          <MetricTile label="Profile" value={hostel ? "Ready" : "Empty"} />
        </div>
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-[6px] border px-3 py-1.5 ${ownerMetricToneClass("default")}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-60">{label}</p>
      <p className="text-[13px] font-semibold">{value}</p>
    </div>
  );
}
