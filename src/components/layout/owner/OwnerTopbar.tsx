"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, House, Menu, Search } from "lucide-react";
import { HostelSwitcher } from "@/components/layout/owner/HostelSwitcher";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { getDueStatus } from "@/utils/payment";

export function OwnerTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentHostel, hostels } = useHostelContext();
  const { tenants } = useOwnerTenants();
  const isDashboard = pathname === "/owner/dashboard";
  const isNotifications = pathname === "/owner/notifications";
  const currentSearchQuery = pathname === "/owner/tenants" ? (searchParams.get("q") ?? "") : "";

  const alerts = useMemo(() => {
    if (!currentHostel) {
      return [];
    }

    return tenants
      .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
      .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
      .filter(({ status }) => status.tone === "red" || status.tone === "orange")
      .sort((left, right) => left.status.priority - right.status.priority);
  }, [currentHostel, tenants]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/owner/dashboard");
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawQuery = formData.get("global-search");
    const nextQuery = typeof rawQuery === "string" ? rawQuery.trim() : "";

    if (!nextQuery) {
      router.push("/owner/tenants");
      return;
    }

    router.push(`/owner/tenants?q=${encodeURIComponent(nextQuery)}`);
  };

  return (
    <header className="sticky top-0 z-50 isolate flex items-center justify-between border-b border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.84)_100%)] px-3 py-2 text-white backdrop-blur-2xl md:px-4 xl:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--fg-primary)] shadow-[0_10px_24px_rgba(2,6,23,0.18)] lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--fg-primary)] shadow-[0_10px_24px_rgba(2,6,23,0.18)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Link
          href="/owner/dashboard"
          aria-label="Go to dashboard"
          className={`rounded-[var(--radius-pill)] border bg-[color:var(--surface-soft)] p-2 shadow-[0_10px_24px_rgba(2,6,23,0.18)] transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--motion-small)] ease-[var(--ease-standard)] ${
            isDashboard
              ? "border-[color:color-mix(in_srgb,var(--warning)_50%,transparent)] text-[color:var(--accent)] shadow-[0_0_0_1px_rgba(249,193,42,0.18),0_12px_28px_rgba(249,193,42,0.12)]"
              : "border-[color:var(--border)] text-[color:var(--fg-secondary)] hover:border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] hover:text-[color:var(--accent)]"
          }`}
        >
          <House className="h-4 w-4" />
        </Link>
        <div className="hidden xl:block">
          <HostelSwitcher />
        </div>
        <button
          type="button"
          onClick={() => router.push("/owner/settings")}
          className="min-w-0 rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-left shadow-[0_10px_24px_rgba(2,6,23,0.18)] xl:hidden"
        >
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Hostel</p>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-white">{currentHostel?.hostelName ?? "Select"}</p>
            {hostels.length > 1 ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[color:var(--fg-secondary)]" /> : null}
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="hidden xl:block">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--accent)]" />
            <input
              name="global-search"
              type="text"
              key={`${pathname}-${currentSearchQuery}`}
              defaultValue={currentSearchQuery}
              placeholder="Search tenants, rooms, phones..."
              className="w-72 rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-2 pl-10 pr-4 text-[13px] text-[color:var(--fg-primary)] outline-none transition-[border-color,box-shadow] duration-[var(--motion-small)] ease-[var(--ease-standard)] placeholder:text-[color:var(--fg-secondary)] focus:border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] focus:shadow-[0_0_0_1px_rgba(249,193,42,0.16),0_12px_28px_rgba(249,193,42,0.1)]"
            />
          </label>
        </form>

        <Link
          href="/owner/notifications"
          aria-label="Open notifications"
          className={`relative rounded-[var(--radius-pill)] border bg-[color:var(--surface-soft)] p-2 text-[color:var(--fg-secondary)] shadow-[0_10px_24px_rgba(2,6,23,0.18)] transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--motion-small)] ease-[var(--ease-standard)] ${
            isNotifications ? "border-[color:color-mix(in_srgb,var(--warning)_50%,transparent)] text-[color:var(--accent)] shadow-[0_0_0_1px_rgba(249,193,42,0.18),0_12px_28px_rgba(249,193,42,0.12)]" : "border-[color:var(--border)] hover:border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] hover:text-[color:var(--accent)]"
          }`}
        >
          <Bell className="h-4 w-4" />
          {alerts.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--error)] px-1 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(239,68,68,0.28)]">
              {alerts.length}
            </span>
          ) : null}
        </Link>

        <Link href="/owner/settings" className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1 shadow-[0_10px_24px_rgba(2,6,23,0.18)]">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-[linear-gradient(180deg,var(--cta)_0%,var(--cta-strong)_100%)] text-[11px] font-semibold text-[#1c1400] shadow-[0_12px_22px_rgba(249,193,42,0.25)]">
            S
          </div>
        </Link>
      </div>
    </header>
  );
}
