import { Building2, Layers3, MapPin } from "lucide-react";
import { getOwnerHostel } from "@/data/ownerHostelStore";
import { Card } from "@/components/ui/card";
import { ownerHeroCardClass, ownerMetricToneClass, ownerPanelClass, ownerSubtlePanelClass } from "@/components/ui/owner-theme";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

const preferenceCards = [
  { label: "Rent reminder", value: "3 days before due date", helper: "SMS + in-app reminder" },
  { label: "Check-in window", value: "08:00 AM - 08:00 PM", helper: "Late entry needs manual approval" },
  { label: "Maintenance escalation", value: "Auto after 24 hours", helper: "High priority goes to owner first" },
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
    <div className="space-y-3 lg:space-y-4">
      <Card className={`overflow-hidden p-4 ${ownerHeroCardClass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Settings</p>
        <h1 className="mt-1 text-xl font-semibold text-white lg:text-[1.9rem] lg:tracking-tight">Hostel settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-[color:var(--fg-secondary)]">Core hostel information is visible here today, while deeper owner preferences are still lightweight.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 xl:max-w-xl">
          <MetricTile label="Floors" value={String(hostel?.floors.length ?? 0)} />
          <MetricTile label="Rooms" value={String(totalRooms)} />
          <MetricTile label="Profile" value={hostel ? "Ready" : "Empty"} />
        </div>
      </Card>

      <div className="grid gap-2.5 xl:grid-cols-3">
        <InfoTile icon={Building2} label="Hostel Name" value={hostel?.hostelName ?? "Not created yet"} />
        <InfoTile icon={MapPin} label="Address" value={hostel?.address ?? "Not created yet"} />
        <InfoTile icon={Layers3} label="Total Floors" value={String(hostel?.floors.length ?? 0)} />
      </div>

      <Card className={`rounded-[24px] p-4 ${ownerPanelClass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Demo preferences</p>
        <h2 className="mt-1 text-base font-semibold text-white">Mock owner settings</h2>
        <div className="mt-3 grid gap-2.5 xl:grid-cols-3">
          {preferenceCards.map((item) => (
            <div key={item.label} className={`rounded-[20px] px-4 py-3 ${ownerSubtlePanelClass}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">{item.helper}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className={`rounded-[24px] p-4 ${ownerPanelClass}`}>
        <p className="text-sm font-semibold text-white">Missing UI</p>
        <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Advanced editable preferences, notification rules, and account-level owner settings are not implemented yet.</p>
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
    <Card className={`rounded-[22px] p-3 ${ownerPanelClass}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
          <p className="mt-1 text-sm font-semibold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-[18px] border px-3 py-2.5 ${ownerMetricToneClass("default")}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
