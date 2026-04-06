import { getOwnerHostel } from "@/data/ownerHostelStore";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function OwnerSettingsPage() {
  const hostel = getOwnerHostel();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-800">Hostel Settings</h1>
      </div>
      <Card className="border-slate-200 bg-white p-6">
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
