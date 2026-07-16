"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BedDouble, Building2, CalendarDays, IndianRupee, Mail, Phone, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonBlock } from "@/components/ui/skeleton";

type VacateInfo = {
  vacatedAt: string;
  moveOutDate?: string;
  advanceRefundAmount?: number;
  refundAdvance?: boolean;
  advanceRefundEligible?: boolean;
  settlementNote?: string;
  noticeGivenDate?: string | null;
};

type VacatedTenant = {
  tenantId: string;
  fullName: string;
  phone: string;
  email: string;
  hostelId: string;
  hostelName: string;
  ownerName: string;
  ownerEmail: string;
  advanceAmount: number;
  advanceBalance: number;
  vacatedAt: string;
  vacateInfo: VacateInfo | null;
  assignment?: { roomNumber?: string };
};

type ApiResponse = {
  period: string;
  count: number;
  totalAdvanceRefunded: number;
  tenants: VacatedTenant[];
  message?: string;
};

const PERIODS = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This Week" },
  { key: "monthly", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

type Period = typeof PERIODS[number]["key"];

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRupee(n: number | undefined | null) {
  if (!n || n === 0) return "₹0";
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function AdminVacatedTenantsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/vacated-tenants?period=${period}`);
        const json = await res.json() as ApiResponse;
        if (!res.ok) {
          setError(json.message ?? "Failed to load vacated tenants.");
          setData(null);
        } else {
          setData(json);
        }
      } catch {
        setError("Network error loading vacated tenants.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [period]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--fg-secondary)]">Admin</p>
        <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Vacated tenants</h1>
        <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">All vacated tenants with settlement and advance-refund records.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold transition ${
              period === key
                ? "border-[color:color-mix(in_srgb,var(--brand)_50%,transparent)] bg-[color:var(--brand-soft)] text-[color:var(--accent)]"
                : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data && !loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon={<UserMinus size={14} />} label="Vacated tenants" value={data.count} />
          <StatCard icon={<IndianRupee size={14} />} label="Total advance refunded" value={fmtRupee(data.totalAdvanceRefunded)} tone={data.totalAdvanceRefunded > 0 ? "warning" : "plain"} />
          <StatCard icon={<CalendarDays size={14} />} label="Period" value={PERIODS.find((p) => p.key === period)?.label ?? "All"} />
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-16 rounded-[var(--radius-md)]" />)}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-[color:var(--error)]">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        ) : !data || data.tenants.length === 0 ? (
          <EmptyState icon={<UserMinus size={28} />} title="No vacated tenants" description="Nothing recorded for this period." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-[13px]">
                <thead className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)]">
                  <tr>
                    {["Name", "Contact", "Hostel / Room", "Vacated On", "Notice Given", "Advance", "Refund", "Note"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => (
                    <tr key={t.tenantId} className="border-t border-[color:var(--border)] transition hover:bg-[color:var(--surface-soft)]">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[color:var(--fg-primary)]">{t.fullName}</p>
                        <p className="text-[11px] text-[color:var(--fg-tertiary)]">{t.ownerName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-[color:var(--fg-secondary)]"><Phone className="h-3 w-3 shrink-0 text-[color:var(--fg-tertiary)]" />{t.phone || "—"}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[color:var(--fg-tertiary)]"><Mail className="h-3 w-3 shrink-0" />{t.email || "—"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-[color:var(--fg-secondary)]"><Building2 className="h-3 w-3 shrink-0 text-[color:var(--fg-tertiary)]" />{t.hostelName}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[color:var(--fg-tertiary)]"><BedDouble className="h-3 w-3 shrink-0" />Room {t.assignment?.roomNumber ?? "Unassigned"}</div>
                      </td>
                      <td className="px-3 py-3 text-[color:var(--fg-secondary)]">{fmtDate(t.vacatedAt)}</td>
                      <td className="px-3 py-3 text-[color:var(--fg-secondary)]">{fmtDate(t.vacateInfo?.noticeGivenDate)}</td>
                      <td className="px-3 py-3 text-[color:var(--fg-secondary)]">{fmtRupee(t.advanceBalance || t.advanceAmount)}</td>
                      <td className="px-3 py-3">
                        {t.vacateInfo?.refundAdvance ? (
                          <span className="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--success)]">{fmtRupee(t.vacateInfo.advanceRefundAmount)}</span>
                        ) : (
                          <span className="text-[11px] text-[color:var(--fg-tertiary)]">No refund</span>
                        )}
                      </td>
                      <td className="max-w-[160px] px-3 py-3"><p className="truncate text-[11px] text-[color:var(--fg-tertiary)]">{t.vacateInfo?.settlementNote || "—"}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[color:var(--border)] lg:hidden">
              {data.tenants.map((t) => (
                <div key={t.tenantId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[color:var(--fg-primary)]">{t.fullName}</p>
                      <p className="text-[11px] text-[color:var(--fg-tertiary)]">{t.hostelName} · Room {t.assignment?.roomNumber ?? "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-[color:var(--fg-secondary)]">Vacated</p>
                      <p className="text-[11px] text-[color:var(--fg-tertiary)]">{fmtDate(t.vacatedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <MiniCell label="Phone" value={t.phone || "—"} />
                    <MiniCell label="Email" value={t.email || "—"} truncate />
                    <MiniCell label="Notice Date" value={fmtDate(t.vacateInfo?.noticeGivenDate)} />
                    <div className="rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-2.5 py-2">
                      <p className="text-[color:var(--fg-tertiary)]">Refund</p>
                      <p className={`font-medium ${t.vacateInfo?.refundAdvance ? "text-[color:var(--success)]" : "text-[color:var(--fg-tertiary)]"}`}>
                        {t.vacateInfo?.refundAdvance ? fmtRupee(t.vacateInfo.advanceRefundAmount) : "None"}
                      </p>
                    </div>
                  </div>
                  {t.vacateInfo?.settlementNote ? (
                    <p className="mt-2 text-[11px] italic text-[color:var(--fg-tertiary)]">&ldquo;{t.vacateInfo.settlementNote}&rdquo;</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function MiniCell({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-2.5 py-2">
      <p className="text-[color:var(--fg-tertiary)]">{label}</p>
      <p className={`font-medium text-[color:var(--fg-primary)] ${truncate ? "truncate" : ""}`}>{value}</p>
    </div>
  );
}
