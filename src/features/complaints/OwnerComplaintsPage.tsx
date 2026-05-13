"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, MessageSquareWarning, QrCode, ToggleLeft, ToggleRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { csrfFetch } from "@/lib/csrf-client";
import { useHostelContext } from "@/store/hostel-context";
import { COMPLAINT_CATEGORIES, type Complaint, type ComplaintStatus } from "@/types/complaint";
import QRCode from "qrcode";

// ── QR Modal ──────────────────────────────────────────────────────────────

function QrModal({ hostelId, hostelName, onClose }: { hostelId: string; hostelName: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState("");
  const url = typeof window !== "undefined" ? `${window.location.origin}/c/${hostelId}` : `/c/${hostelId}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: "#ffffff", light: "#09090b" },
    }).then(() => {
      setDataUrl(canvasRef.current?.toDataURL("image/png") ?? "");
    });
  }, [url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(2,6,23,0.82)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-[min(100%,22rem)] rounded-3xl border border-white/8 bg-[#111114] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">QR Code</p>
            <p className="mt-0.5 text-[11px] text-white/40">{hostelName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-white/40 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <canvas ref={canvasRef} className="rounded-2xl" />
        </div>

        <p className="mt-3 break-all text-center text-[11px] text-white/30">{url}</p>

        {dataUrl && (
          <a
            href={dataUrl}
            download={`complaint-qr-${hostelId}.png`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.07] py-2.5 text-[13px] font-semibold text-white hover:bg-white/[0.12] transition"
          >
            Download PNG
          </a>
        )}
        <p className="mt-2 text-center text-[11px] text-white/25">
          Print and paste in common areas for tenants to scan.
        </p>
      </div>
    </div>
  );
}

// ── Complaint card ────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ComplaintStatus, string> = {
  new: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  reviewed: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  resolved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const STATUS_ICON: Record<ComplaintStatus, React.ReactNode> = {
  new: <AlertTriangle className="h-3 w-3" />,
  reviewed: <Clock className="h-3 w-3" />,
  resolved: <CheckCircle2 className="h-3 w-3" />,
};

function ComplaintCard({
  complaint,
  onUpdate,
}: {
  complaint: Complaint;
  onUpdate: (updated: Complaint) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(complaint.notes ?? "");
  const [saving, setSaving] = useState(false);

  const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category);
  const dateStr = new Date(complaint.createdAt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const patch = async (status?: ComplaintStatus, newNotes?: string) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (status !== undefined) body.status = status;
      if (newNotes !== undefined) body.notes = newNotes;
      const res = await csrfFetch(`/api/complaints/${encodeURIComponent(complaint.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { complaint?: Complaint };
      if (res.ok && data.complaint) onUpdate(data.complaint);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03]">
      {/* Top row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 text-lg">{categoryInfo?.emoji ?? "💬"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-white/70">{categoryInfo?.label ?? complaint.category}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[complaint.status]}`}
            >
              {STATUS_ICON[complaint.status]}
              {complaint.status}
            </span>
            <span className="text-[10px] text-white/25">{dateStr}</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{complaint.message}</p>
          {complaint.notes && !open && (
            <p className="mt-1 text-[11px] italic text-white/40">Note: {complaint.notes}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-xl p-1.5 text-white/30 hover:text-white transition"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expanded actions */}
      {open && (
        <div className="border-t border-white/8 px-4 py-3 space-y-3">
          {/* Status buttons */}
          <div className="flex flex-wrap gap-2">
            {(["new", "reviewed", "resolved"] as ComplaintStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={saving || complaint.status === s}
                onClick={() => void patch(s)}
                className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
                  complaint.status === s ? STATUS_STYLE[s] : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {s === "new" ? "Mark New" : s === "reviewed" ? "Mark Reviewed" : "Mark Resolved"}
              </button>
            ))}
          </div>

          {/* Private notes */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-white/40">Private note (only you see this)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add internal note…"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/20 focus:border-white/20"
            />
            <button
              type="button"
              disabled={saving || notes === (complaint.notes ?? "")}
              onClick={() => void patch(undefined, notes)}
              className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/60 hover:text-white transition disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function OwnerComplaintsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ComplaintsContent />
    </Suspense>
  );
}

function ComplaintsContent() {
  const { currentHostel, currentHostelId, refreshHostels } = useHostelContext();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "all">("all");

  const fetchComplaints = useCallback(async (hostelId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints?hostelId=${encodeURIComponent(hostelId)}`);
      const data = (await res.json()) as { complaints?: Complaint[] };
      setComplaints(data.complaints ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentHostelId) {
      void fetchComplaints(currentHostelId);
    } else {
      setLoading(false);
    }
  }, [currentHostelId, fetchComplaints]);

  const handleToggle = async () => {
    if (!currentHostel || toggling) return;
    setToggling(true);
    try {
      await csrfFetch(`/api/hostels/${encodeURIComponent(currentHostel.id)}/complaints-toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !(currentHostel.complaintsEnabled ?? true) }),
      });
      await refreshHostels();
    } finally {
      setToggling(false);
    }
  };

  const handleUpdate = useCallback((updated: Complaint) => {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const complaintsEnabled = currentHostel?.complaintsEnabled ?? true;

  const filtered = filterStatus === "all"
    ? complaints
    : complaints.filter((c) => c.status === filterStatus);

  const counts = {
    new: complaints.filter((c) => c.status === "new").length,
    reviewed: complaints.filter((c) => c.status === "reviewed").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  if (!currentHostel && !loading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm font-semibold text-white">No hostel selected.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,#151518_0%,#0d0d10_100%)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/8 px-3 py-1 text-[11px] font-semibold text-amber-300">
              <MessageSquareWarning className="h-3.5 w-3.5" />
              Complaint Box
            </div>
            <h1 className="mt-2 text-[1.3rem] font-semibold text-white">
              {currentHostel?.hostelName ?? "Complaints"}
            </h1>
            <p className="mt-0.5 text-[12px] text-white/40">
              Anonymous complaints submitted by tenants via QR scan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Enable/disable toggle */}
            {currentHostel && (
              <button
                type="button"
                disabled={toggling}
                onClick={() => void handleToggle()}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-semibold transition disabled:opacity-50 ${
                  complaintsEnabled
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    : "border-white/12 bg-white/[0.05] text-white/50 hover:text-white/70"
                }`}
              >
                {complaintsEnabled
                  ? <ToggleRight className="h-4 w-4" />
                  : <ToggleLeft className="h-4 w-4" />}
                {complaintsEnabled ? "Accepting" : "Disabled"}
              </button>
            )}

            {/* QR button */}
            {currentHostel && (
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.1]"
              >
                <QrCode className="h-4 w-4" />
                QR Code
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {(["new", "reviewed", "resolved"] as ComplaintStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus((prev) => (prev === s ? "all" : s))}
            className={`rounded-2xl border p-3 text-left transition ${
              filterStatus === s ? STATUS_STYLE[s] : "border-white/8 bg-white/[0.03] text-white/50 hover:border-white/15"
            }`}
          >
            <p className="text-[1.2rem] font-bold leading-none text-white">{counts[s]}</p>
            <p className="mt-1 text-[10px] font-semibold capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquareWarning className="mx-auto mb-3 h-8 w-8 text-white/15" />
          <p className="text-sm font-semibold text-white/50">
            {complaints.length === 0 ? "No complaints yet" : `No ${filterStatus} complaints`}
          </p>
          {complaints.length === 0 && (
            <p className="mt-1 text-[12px] text-white/25">
              Share the QR code with tenants to start collecting feedback.
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <ComplaintCard key={c.id} complaint={c} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* QR modal */}
      {qrOpen && currentHostel && (
        <QrModal
          hostelId={currentHostel.id}
          hostelName={currentHostel.hostelName}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-28 rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-16 rounded-2xl" />)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-2xl" />)}
      </div>
    </div>
  );
}
