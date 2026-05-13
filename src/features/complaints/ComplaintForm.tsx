"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldOff } from "lucide-react";
import { COMPLAINT_CATEGORIES, type ComplaintCategory } from "@/types/complaint";

export function ComplaintForm({
  hostelId,
  hostelName,
  complaintsEnabled,
}: {
  hostelId: string;
  hostelName: string;
  complaintsEnabled: boolean;
}) {
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!complaintsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <ShieldOff className="h-10 w-10 text-white/20" />
        <p className="text-base font-semibold text-white/60">Complaints are not being accepted</p>
        <p className="text-sm text-white/30">The management has disabled the complaints box for this hostel.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="text-base font-semibold text-white">Complaint submitted</p>
        <p className="max-w-xs text-sm text-white/45">
          Your feedback has been sent anonymously to the management. Thank you.
        </p>
        <button
          type="button"
          onClick={() => { setDone(false); setCategory(""); setMessage(""); setError(""); }}
          className="mt-2 rounded-xl border border-white/12 bg-white/[0.06] px-5 py-2 text-sm font-medium text-white/70 hover:text-white transition"
        >
          Submit another
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError("");
    if (!category) { setError("Select a category."); return; }
    if (message.trim().length < 10) { setError("Message must be at least 10 characters."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/complaints/${encodeURIComponent(hostelId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) { setError(data.message ?? "Submission failed. Try again."); return; }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category */}
      <div>
        <p className="mb-2.5 text-[12px] font-semibold text-white/60">Category *</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COMPLAINT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={submitting}
              onClick={() => setCategory(c.value)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[13px] font-medium transition ${
                category === c.value
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white/80"
              }`}
            >
              <span>{c.emoji}</span>
              <span className="leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-white/60">
          Describe the issue *
          <span className="ml-2 font-normal text-white/30">{message.length}/1000</span>
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          disabled={submitting}
          rows={5}
          placeholder="Describe the issue in detail… (min 10 characters)"
          className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-3 text-[13px] text-white outline-none placeholder:text-white/20 focus:border-white/25"
        />
      </div>

      {/* Anonymous notice */}
      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
        <span className="text-base">🔒</span>
        <p className="text-[11px] text-white/40">
          This complaint is completely anonymous. No personal information is collected.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="w-full rounded-2xl bg-[linear-gradient(90deg,#b45309_0%,#d97706_100%)] py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(180,83,9,0.25)] transition hover:brightness-105 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : `Submit Complaint to ${hostelName}`}
      </button>
    </div>
  );
}
