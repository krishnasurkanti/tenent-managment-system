"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, CreditCard, DoorOpen,
  ReceiptText, UserPlus, X,
} from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Card } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardCarousel } from "@/components/ui/data/card-carousel";
import { AlertCard } from "@/components/ui/data/alert-card";
import { StatusBadge } from "@/components/ui/data/status-badge";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";
import { getHostelOccupancySummary } from "@/utils/hostel-occupancy";
import { TenantRentSearch } from "@/features/payments/components/TenantRentSearch";
import type { OwnerHostel } from "@/types/owner-hostel";
import type { TenantRecord } from "@/types/tenant";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);

  useEffect(() => {
    if (!hostelLoading && !currentHostel) {
      router.replace("/owner/create-hostel");
    }
  }, [hostelLoading, currentHostel, router]);

  if (hostelLoading || !currentHostel || tenantLoading) {
    return <LoadingState />;
  }

  return <DashboardContent hostel={currentHostel} allTenants={allTenants} isSwitching={isSwitching} />;
}

function DashboardContent({
  hostel,
  allTenants,
  isSwitching,
}: {
  hostel: OwnerHostel;
  allTenants: TenantRecord[];
  isSwitching: boolean;
}) {
  const [activityVisible, setActivityVisible] = useState(5);

  const tenants = useMemo(
    () => allTenants.filter((t) => t.assignment?.hostelId === hostel.id),
    [allTenants, hostel.id],
  );

  const isResidence = hostel.type === "RESIDENCE";
  const occupancy = useMemo(() => getHostelOccupancySummary(hostel, tenants), [hostel, tenants]);
  const { totalRooms, totalBeds } = occupancy;
  const availableBeds = isResidence ? occupancy.vacantUnits : occupancy.vacantBeds;

  const { dueSoon, overdue, paid } = useMemo(() => {
    const ds: TenantRecord[] = [];
    const ov: TenantRecord[] = [];
    const pd: TenantRecord[] = [];
    for (const t of tenants) {
      const tone = getDueStatus(t.nextDueDate, t.billingCycle).tone;
      if (tone === "orange" || tone === "yellow") ds.push(t);
      else if (tone === "red") ov.push(t);
      else if (tone === "green") pd.push(t);
    }
    return { dueSoon: ds, overdue: ov, paid: pd };
  }, [tenants]);

  const { totalCollected, dueAmount, overdueAmount, expectedRevenue } = useMemo(() => ({
    totalCollected: paid.reduce((sum, t) => sum + t.rentPaid, 0),
    dueAmount: dueSoon.reduce((sum, t) => sum + t.monthlyRent, 0),
    overdueAmount: overdue.reduce((sum, t) => sum + t.monthlyRent, 0),
    expectedRevenue: tenants.reduce((sum, t) => sum + t.monthlyRent, 0),
  }), [tenants, dueSoon, overdue, paid]);

  const { occupancyPercent, collectionRate } = useMemo(() => {
    const capacityBase = isResidence ? totalRooms : totalBeds;
    const occ = capacityBase > 0 ? Math.round((tenants.length / capacityBase) * 100) : 0;
    const cr = expectedRevenue > 0 ? Math.round((totalCollected / expectedRevenue) * 100) : 0;
    return { occupancyPercent: occ, collectionRate: cr };
  }, [isResidence, totalRooms, totalBeds, tenants.length, expectedRevenue, totalCollected]);

  const allDueItems = useMemo(
    () => tenants
      .map((t) => ({ tenant: t, status: getDueStatus(t.nextDueDate, t.billingCycle) }))
      .sort((a, b) => a.status.priority - b.status.priority),
    [tenants],
  );

  const alertItems = useMemo(
    () => allDueItems.filter(({ status }) => status.tone !== "green"),
    [allDueItems],
  );

  const recentDueItems = allDueItems.slice(0, activityVisible);
  const hasMore = activityVisible < allDueItems.length;

  return (
    <div className={`flex flex-col gap-5 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">
            Owner dashboard
          </p>
          <h1 className="font-display mt-0.5 truncate text-[clamp(1.35rem,4.5vw,2rem)] font-bold text-[color:var(--fg-primary)]">
            {hostel.hostelName}
          </h1>
          <p className="mt-0.5 truncate text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">
            {hostel.address}
          </p>
        </div>
        <span className="mt-1 shrink-0 rounded-full border border-[color:color-mix(in_srgb,var(--brand)_35%,transparent)] bg-[color:var(--brand-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--accent)]">
          {occupancyPercent}% full
        </span>
      </header>

      {/* ── Alert carousel ── */}
      <DashboardAlertBanner alertItems={alertItems} />

      {/* ── Rent collection hero ── */}
      <Card className="border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_38%),linear-gradient(160deg,#111114_0%,#0b0b16_100%)] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">
              Collected this cycle
            </p>
            <p className="font-display mt-1 text-[clamp(1.6rem,7vw,2.25rem)] font-bold leading-none text-[color:var(--success)]">
              {inr(totalCollected)}
            </p>
          </div>
          <p className="shrink-0 text-right text-[length:var(--text-xs-size)] text-[color:var(--fg-secondary)]">
            of {inr(expectedRevenue)}
            <br />
            <span className="font-semibold text-[color:var(--fg-primary)]">{collectionRate}%</span>
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#16a34a,#22c55e)] transition-[width] duration-[var(--duration-slow)]"
            style={{ width: `${Math.min(100, collectionRate)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <StatCard label="Due" value={inr(dueAmount)} helper={`${dueSoon.length} tenants`} tone={dueSoon.length ? "warning" : "plain"} />
          <StatCard label="Overdue" value={inr(overdueAmount)} helper={`${overdue.length} tenants`} tone={overdue.length ? "danger" : "plain"} />
          <StatCard label={isResidence ? "Vacant units" : "Vacant beds"} value={availableBeds} helper={`${totalRooms} rooms`} />
        </div>
      </Card>

      {/* ── Quick actions ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionTile href="/owner/tenants?action=add-tenant" icon={UserPlus} label="Add Tenant" note="New check-in" />
        <ActionTile href="/owner/payments?action=pay-rent" icon={CreditCard} label="Collect Rent" note="Record payment" />
        <ActionTile href="/owner/rooms" icon={DoorOpen} label="Rooms" note={`${availableBeds} available`} />
        <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Alerts" note={`${overdue.length} overdue`} tone={overdue.length ? "danger" : "default"} />
      </section>

      {/* ── Needs attention ── */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">
            Needs attention
          </h2>
          <Link href="/owner/payments?filter=due" className="text-[length:var(--text-xs-size)] font-semibold text-[color:var(--accent)]">
            View all →
          </Link>
        </div>
        {recentDueItems.length === 0 ? (
          <Card>
            <EmptyState icon={<ReceiptText size={28} />} title="Nothing due" description="No pending collections for this hostel right now." />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recentDueItems.map(({ tenant, status }) => (
              <div
                key={tenant.tenantId}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2.5 shadow-[var(--shadow-1)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1,#4f46e5)] text-xs font-bold uppercase text-white">
                  {tenant.fullName.slice(0, 1)}
                </span>
                <Link href={`/owner/tenants/${tenant.tenantId}`} className="min-w-0 flex-1">
                  <p className="truncate text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">
                    {tenant.fullName}
                  </p>
                  <p className="truncate text-[length:var(--text-xs-size)] text-[color:var(--fg-secondary)]">
                    Room {tenant.assignment?.roomNumber ?? "—"} · {formatPaymentDate(tenant.nextDueDate)}
                  </p>
                </Link>
                {status.tone !== "green" ? (
                  <Link
                    href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-3 text-[11px] font-semibold text-white shadow-[var(--shadow-brand)]"
                  >
                    Collect <ArrowRight size={13} />
                  </Link>
                ) : (
                  <StatusBadge status="paid">Paid</StatusBadge>
                )}
              </div>
            ))}
            {hasMore ? (
              <button
                type="button"
                onClick={() => setActivityVisible((v) => v + 8)}
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-2 text-[length:var(--text-xs-size)] font-semibold text-[color:var(--fg-secondary)] hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--fg-primary)]"
              >
                Load more ({allDueItems.length - activityVisible} remaining)
              </button>
            ) : null}
          </div>
        )}
      </section>

      <TenantRentSearch tenants={tenants} hideButton />
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
  note,
  tone = "default",
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  note: string;
  tone?: "default" | "danger";
}) {
  const iconClass =
    tone === "danger"
      ? "bg-[color:var(--error-soft)] text-[color:var(--error)]"
      : "bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]";
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-1)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)]"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${iconClass}`}>
        <Icon size={17} />
      </span>
      <span className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">{label}</span>
      <span className="truncate text-[length:var(--text-xs-size)] text-[color:var(--fg-secondary)]">{note}</span>
    </Link>
  );
}

// ── Alert carousel — preserves dismiss + see-more + upcoming-fill logic ──────

const UPCOMING_FILL = [
  { icon: "💳", title: "Online rent payments", desc: "Collect rent digitally — tenants pay from their phone." },
  { icon: "💬", title: "WhatsApp notifications", desc: "Auto-send payment reminders via WhatsApp." },
  { icon: "📧", title: "Gmail notifications", desc: "Email receipts and due-date reminders automatically." },
  { icon: "📋", title: "Tenant portal", desc: "Tenants view receipts and raise maintenance requests." },
  { icon: "📊", title: "Analytics dashboard", desc: "Unified occupancy and collection view across hostels." },
];

type BannerAlert = { kind: "alert"; tenant: TenantRecord; status: ReturnType<typeof getDueStatus> };
type BannerFill = { kind: "upcoming"; icon: string; title: string; desc: string };
type BannerSeeMore = { kind: "seemore"; count: number };
type BannerCard = BannerAlert | BannerFill | BannerSeeMore;

function DashboardAlertBanner({
  alertItems,
}: {
  alertItems: Array<{ tenant: TenantRecord; status: ReturnType<typeof getDueStatus> }>;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dash_dismissed_v1") : null;
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set<string>();
    }
  });

  const active = useMemo(
    () => alertItems.filter(({ tenant }) => !dismissed.has(tenant.tenantId)),
    [alertItems, dismissed],
  );

  const cards = useMemo<BannerCard[]>(() => {
    const alerts = active.slice(0, 5);
    const extra = active.length - alerts.length;
    const fill = extra > 0 ? [] : UPCOMING_FILL.slice(0, 5 - alerts.length);
    return [
      ...alerts.map((a): BannerAlert => ({ kind: "alert", ...a })),
      ...fill.map((f): BannerFill => ({ kind: "upcoming", ...f })),
      ...(extra > 0 ? [{ kind: "seemore" as const, count: extra }] : []),
    ];
  }, [active]);

  const dismiss = (tenantId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(tenantId);
      try {
        localStorage.setItem("dash_dismissed_v1", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  if (cards.length === 0) return null;

  return (
    <CardCarousel ariaLabel="Rent alerts" autoAdvanceMs={4500} align="center" className="pt-1">
      {cards.map((card, i) => {
        if (card.kind === "alert") {
          const { tenant, status } = card;
          const tone = status.tone === "red" ? "critical" : status.tone === "orange" ? "warning" : "upcoming";
          return (
            <AlertCard
              key={tenant.tenantId}
              tone={tone}
              title={tenant.fullName}
              message={`Room ${tenant.assignment?.roomNumber ?? "—"} · ${status.label}`}
              amountLabel={inr(tenant.monthlyRent)}
              action={
                <div className="flex gap-2">
                  <Link
                    href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                    className="inline-flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] py-1.5 text-[12px] font-semibold text-[color:var(--fg-primary)] hover:bg-[color:var(--surface-strong)]"
                  >
                    Collect {inr(tenant.monthlyRent)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => dismiss(tenant.tenantId)}
                    aria-label={`Dismiss alert for ${tenant.fullName}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-primary)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              }
            />
          );
        }
        if (card.kind === "upcoming") {
          return (
            <AlertCard
              key={`up-${i}`}
              tone="upcoming"
              title={`${card.icon}  ${card.title}`}
              message={card.desc}
              action={
                <span className="block rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-1.5 text-center text-[11px] text-[color:var(--fg-tertiary)]">
                  Coming soon
                </span>
              }
            />
          );
        }
        return (
          <AlertCard
            key="seemore"
            tone="upcoming"
            title={`+${card.count} more alert${card.count > 1 ? "s" : ""}`}
            message="View all pending collections"
            action={
              <Link
                href="/owner/notifications"
                className="block rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] py-1.5 text-center text-[12px] font-semibold text-[color:var(--fg-primary)] hover:bg-[color:var(--surface-strong)]"
              >
                See all alerts →
              </Link>
            }
          />
        );
      })}
    </CardCarousel>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-2 h-8 w-56" />
          <SkeletonBlock className="mt-2 h-3.5 w-40" />
        </div>
        <SkeletonBlock className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <SkeletonBlock className="h-[120px] w-72 shrink-0 rounded-[var(--radius-lg)]" />
        <SkeletonBlock className="h-[120px] w-72 shrink-0 rounded-[var(--radius-lg)] opacity-40" />
      </div>
      <SkeletonBlock className="h-44 rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  );
}
