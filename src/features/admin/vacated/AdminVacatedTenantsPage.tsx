"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Phone, Mail, Building2, BedDouble, AlertCircle, IndianRupee, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Admin</p>
        <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-white">Vacated Tenants</h1>
        <p className="mt-1 text-[12px] text-white/40">All vacated tenants with settlement and advance refund records.</p>
      </div>

      {/* Period tabs */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold transition ${
              period === key
                ? "border-blue-500/60 bg-blue-600/20 text-blue-300"
                : "border-white/12 bg-white/[0.05] text-white/50 hover:text-white hover:border-white/25"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {data && !loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            icon={UserMinus}
            label="Vacated Tenants"
            value={String(data.count)}
            tone="default"
          />
          <SummaryCard
            icon={IndianRupee}
            label="Total Advance Refunded"
            value={fmtRupee(data.totalAdvanceRefunded)}
            tone={data.totalAdvanceRefunded > 0 ? "warning" : "default"}
          />
          <SummaryCard
            icon={CalendarDays}
            label="Period"
            value={PERIODS.find((p) => p.key === period)?.label ?? "All"}
            tone="default"
          />
        </div>
      ) : null}

      {/* Table */}
      <Card className="overflow-hidden rounded-[10px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(30,41,59,0.94)_0%,rgba(15,23,42,0.98)_100%)] p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : !data || data.tenants.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <UserMinus className="mx-auto mb-3 h-8 w-8 text-white/15" />
            <p className="text-sm font-semibold text-white/40">No vacated tenants for this period.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-[13px]">
                <thead className="border-b border-white/[0.06] bg-white/[0.03]">
                  <tr>
                    {["Name", "Contact", "Hostel / Room", "Vacated On", "Notice Given", "Advance", "Refund", "Note"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => (
                    <tr key={t.tenantId} className="border-t border-white/[0.05] transition hover:bg-white/[0.02]">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">{t.fullName}</p>
                        <p className="text-[11px] text-white/40">{t.ownerName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-white/70">
                          <Phone className="h-3 w-3 shrink-0 text-white/30" />
                          {t.phone || "—"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40">
                          <Mail className="h-3 w-3 shrink-0" />
                          {t.email || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-white/70">
                          <Building2 className="h-3 w-3 shrink-0 text-white/30" />
                          {t.hostelName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40">
                          <BedDouble className="h-3 w-3 shrink-0" />
                          Room {t.assignment?.roomNumber ?? "Unassigned"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white/70">{fmtDate(t.vacatedAt)}</td>
                      <td className="px-3 py-3 text-white/70">{fmtDate(t.vacateInfo?.noticeGivenDate)}</td>
                      <td className="px-3 py-3 text-white/70">{fmtRupee(t.advanceBalance || t.advanceAmount)}</td>
                      <td className="px-3 py-3">
                        {t.vacateInfo?.refundAdvance ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            {fmtRupee(t.vacateInfo.advanceRefundAmount)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-white/25">No refund</span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <p className="truncate text-[11px] text-white/40">{t.vacateInfo?.settlementNote || "—"}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-0 divide-y divide-white/[0.05] lg:hidden">
              {data.tenants.map((t) => (
                <div key={t.tenantId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{t.fullName}</p>
                      <p className="text-[11px] text-white/40">{t.hostelName} · Room {t.assignment?.roomNumber ?? "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-white/50">Vacated</p>
                      <p className="text-[11px] text-white/40">{fmtDate(t.vacatedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-white/[0.04] px-2.5 py-2">
                      <p className="text-white/40">Phone</p>
                      <p className="font-medium text-white">{t.phone || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-2.5 py-2">
                      <p className="text-white/40">Email</p>
                      <p className="font-medium text-white truncate">{t.email || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-2.5 py-2">
                      <p className="text-white/40">Notice Date</p>
                      <p className="font-medium text-white">{fmtDate(t.vacateInfo?.noticeGivenDate)}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-2.5 py-2">
                      <p className="text-white/40">Refund</p>
                      <p className={`font-medium ${t.vacateInfo?.refundAdvance ? "text-emerald-400" : "text-white/30"}`}>
                        {t.vacateInfo?.refundAdvance ? fmtRupee(t.vacateInfo.advanceRefundAmount) : "None"}
                      </p>
                    </div>
                  </div>
                  {t.vacateInfo?.settlementNote ? (
                    <p className="mt-2 text-[11px] text-white/35 italic">"{t.vacateInfo.settlementNote}"</p>
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "default" | "warning";
}) {
  const toneClass = tone === "warning"
    ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-300"
    : "border-white/[0.08] bg-white/[0.04] text-white";

  return (
    <Card className={`rounded-[8px] border p-3 ${toneClass}`}>
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-black/10 p-2 ring-1 ring-white/8">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
          <p className="mt-1 text-[1.1rem] font-semibold leading-none">{value}</p>
        </div>
      </div>
    </Card>
  );
}
