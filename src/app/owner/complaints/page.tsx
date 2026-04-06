import { Card } from "@/components/ui/card";

const complaints = [
  { title: "Water leakage in Room 203", priority: "High", status: "Open" },
  { title: "Wi-Fi issue on Floor 1", priority: "Medium", status: "In Progress" },
  { title: "Fan replacement in Room 105", priority: "Low", status: "Resolved" },
];

export default function OwnerComplaintsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-5 py-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Complaints</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-800">Complaint Register</h1>
        <p className="mt-2 text-sm text-slate-500">Track maintenance issues in the same soft operational view as the rest of the workspace.</p>
      </div>
      <div className="grid gap-4">
        {complaints.map((complaint) => (
          <Card key={complaint.title} className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{complaint.title}</h2>
                <p className="mt-2 text-sm text-slate-500">Priority: {complaint.priority}</p>
              </div>
              <span className="rounded-full bg-[var(--pill-gradient)] px-3 py-1 text-sm font-medium text-violet-700">{complaint.status}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
