import { getOwnerHostel } from "@/data/ownerHostelStore";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function OwnerSettingsPage() {
  const hostel = getOwnerHostel();

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-5 py-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-800">Hostel Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Keep your hostel profile, structure, and workspace preferences in one clean place.</p>
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-800">Saved Hostel Info</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>Hostel Name: {hostel?.hostelName ?? "Not created yet"}</p>
          <p>Address: {hostel?.address ?? "Not created yet"}</p>
          <p>Total Floors: {hostel?.floors.length ?? 0}</p>
        </div>
      </Card>
    </div>
  );
}
