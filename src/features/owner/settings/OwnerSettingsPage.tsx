import Link from "next/link";
import { Building2, MapPin, PencilLine } from "lucide-react";
import { getOwnerHostel } from "@/data/ownerHostelStore";
import { StatCard } from "@/components/ui/stat-card";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { ProfileEditClient } from "./ProfileEditClient";
import { NotificationPrefsClient } from "./NotificationPrefsClient";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const session = await getOwnerSession();
  let hostel = null;

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels");
    const payload = (await backendResponse.json()) as {
      hostels?: Array<{ id: string; hostelName: string; address: string; rooms: unknown[] }>;
    };
    hostel = Array.isArray(payload.hostels) ? payload.hostels[0] ?? null : null;
  } else {
    hostel = getOwnerHostel(undefined, session.isDemo);
  }

  const totalRooms = hostel?.rooms.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Settings</p>
        <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Hostel settings</h1>
        <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">
          Review your active hostel profile, defaults, and owner setup.
        </p>
      </header>

      {/* ── Summary ── */}
      <section className="grid grid-cols-2 gap-2.5">
        <StatCard label="Rooms" value={totalRooms} helper="Total inventory" />
        <StatCard label="Profile" value={hostel ? "Ready" : "Empty"} helper="Owner setup state" tone={hostel ? "success" : "plain"} />
      </section>

      {/* ── Hostel info ── */}
      <section className="grid gap-2.5 sm:grid-cols-2">
        <InfoTile icon={<Building2 size={15} />} label="Hostel name" value={hostel?.hostelName ?? "Not created yet"} />
        <InfoTile icon={<MapPin size={15} />} label="Address" value={hostel?.address ?? "Not created yet"} />
      </section>

      <Link
        href="/owner/create-hostel?mode=edit"
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-4 text-[length:var(--text-sm-size)] font-semibold text-white shadow-[var(--shadow-brand)] hover:brightness-105"
      >
        <PencilLine size={16} />
        Edit hostel
      </Link>

      <ProfileEditClient isDemo={session.isDemo} />
      <NotificationPrefsClient />
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-1)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-[color:var(--fg-primary)]">{value}</p>
      </div>
    </div>
  );
}
