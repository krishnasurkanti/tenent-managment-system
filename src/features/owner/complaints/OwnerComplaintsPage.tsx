import { AlertTriangle, Clock3, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

const complaints = [
  {
    title: "Water leakage in Room 203",
    priority: "High",
    status: "Open",
    room: "203",
    raisedBy: "Rahul Verma",
    updatedAt: "Today, 8:45 AM",
    note: "Leak reported near washroom wall after overnight rain.",
  },
  {
    title: "Wi-Fi issue on Floor 1",
    priority: "Medium",
    status: "In Progress",
    room: "Lobby",
    raisedBy: "Floor supervisor",
    updatedAt: "Today, 11:20 AM",
    note: "Router restart done, waiting for ISP line check.",
  },
  {
    title: "Fan replacement in Room 105",
    priority: "Low",
    status: "Resolved",
    room: "105",
    raisedBy: "Nikhil Singh",
    updatedAt: "Yesterday, 5:10 PM",
    note: "New ceiling fan installed and tested successfully.",
  },
  {
    title: "Bathroom latch broken in Room 307",
    priority: "Medium",
    status: "Open",
    room: "307",
    raisedBy: "Aman Khan",
    updatedAt: "Yesterday, 9:00 PM",
    note: "Temporary fix requested before evening rounds.",
  },
];

export default function OwnerComplaintsPage() {
  return (
    <div className="space-y-4 text-white">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,#0f1425_0%,#0b101c_100%)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Complaints</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-[2.5rem]">Complaint register</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--fg-secondary)]">
          Complaint tracking now follows the same dark operational system, even though the deeper workflow is still mock data for now.
        </p>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        {complaints.map((complaint) => (
          <Card key={complaint.title} className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white shadow-[0_14px_30px_rgba(2,6,23,0.22)]">
            <div className="flex items-start gap-3">
              <div className="rounded-[24px] bg-[color:var(--brand-soft)] p-3 text-[color:var(--accent-electric)]">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold text-white">{complaint.title}</h2>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">
                    Mock
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge label={`Priority ${complaint.priority}`} tone={complaint.priority === "High" ? "danger" : complaint.priority === "Medium" ? "warning" : "default"} />
                  <Badge label={complaint.status} tone={complaint.status === "Resolved" ? "success" : complaint.status === "Open" ? "danger" : "warning"} />
                  <Badge label={`Room ${complaint.room}`} tone="default" />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <MiniInfo label="Raised by" value={complaint.raisedBy} />
                  <MiniInfo label="Updated" value={complaint.updatedAt} />
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:var(--fg-secondary)]">{complaint.note}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] text-[color:var(--fg-secondary)]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Real complaint actions are still missing
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "default" | "success" | "warning" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]"
      : tone === "warning"
        ? "border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_12px_24px_rgba(250,204,21,0.24)]"
        : tone === "danger"
          ? "border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_12px_24px_rgba(220,38,38,0.24)]"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-secondary)]";

  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${toneClass}`}>{label}</span>;
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-white">
        {label === "Updated" ? <Clock3 className="h-3.5 w-3.5 text-[color:var(--fg-secondary)]" /> : null}
        {value}
      </p>
    </div>
  );
}
