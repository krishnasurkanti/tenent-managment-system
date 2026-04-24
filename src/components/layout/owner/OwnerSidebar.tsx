"use client";

import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  BedDouble,
  Bell,
  Building2,
  CreditCard,
  CircleDollarSign,
  PencilLine,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { logoutOwner } from "@/services/auth/auth.service";
import { cn } from "@/utils/cn";

const workspaceNavigation = [
  { name: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { name: "Pricing", href: "/owner/billing", icon: CircleDollarSign },
  { name: "Notifications", href: "/owner/notifications", icon: Bell },
  { name: "Rooms", href: "/owner/rooms", icon: BedDouble },
  { name: "Tenants", href: "/owner/tenants", icon: Users },
  { name: "Payments", href: "/owner/payments", icon: CreditCard },
];

const hostelNavigation = [
  { name: "Edit Hostel", href: "/owner/create-hostel?mode=edit", icon: PencilLine },
  { name: "Settings", href: "/owner/settings", icon: Settings },
];

export function OwnerSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  useLockBodyScroll(open);

  const handleLogout = async () => {
    await logoutOwner();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("currentHostelId");
    }
    onClose();
    router.push("/login");
    router.refresh();
  };

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-[color:var(--overlay)] transition lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[288px] max-w-[84vw] flex-col bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--sidebar)_46%,var(--hero-gradient)_100%)] text-[color:var(--fg-primary)] shadow-[0_30px_90px_rgba(8,18,37,0.34)] backdrop-blur-xl transition-transform duration-[var(--motion-medium)] ease-[var(--ease-standard)] lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:max-h-dvh lg:w-[280px] lg:max-w-none lg:translate-x-0 lg:border-r lg:border-[color:var(--border)] lg:shadow-none xl:w-[296px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="border-b border-[color:var(--border)] px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="rounded-[6px] bg-[color:var(--surface-strong)] p-2.5 text-[color:var(--fg-primary)] ring-1 ring-[color:var(--border)]">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[1.9rem] font-bold tracking-tight leading-none text-[color:var(--fg-primary)]">
              Hostel<span className="text-[color:var(--accent-electric)]">Hub</span>
            </p>
            <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">Management System</p>
          </div>
        </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--fg-primary)] transition hover:bg-[color:var(--surface-strong)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarGutter: "stable" }}>
        <div className="mb-5">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--fg-secondary)]">Workspace</p>
          <nav className="space-y-1.5">
        {workspaceNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-left text-[13px] font-medium transition",
                active
                  ? "bg-[linear-gradient(135deg,var(--brand-soft)_0%,rgba(129,140,248,0.16)_100%)] text-[color:var(--fg-primary)] shadow-[0_14px_34px_rgba(99,102,241,0.16)]"
                  : "text-[color:color-mix(in_srgb,var(--fg-primary)_82%,transparent)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--fg-primary)]",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", active ? "border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--accent-electric)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:color-mix(in_srgb,var(--fg-primary)_80%,transparent)] group-hover:border-[color:var(--border-strong)] group-hover:bg-[color:var(--surface-strong)] group-hover:text-[color:var(--accent-electric)]")}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.name}
            </button>
          );
        })}
          </nav>
        </div>

        <div className="mb-5">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--fg-secondary)]">Hostel</p>
          <nav className="space-y-1.5">
        {hostelNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-left text-[13px] font-medium transition",
                active
                  ? "bg-[linear-gradient(135deg,var(--brand-soft)_0%,rgba(129,140,248,0.16)_100%)] text-[color:var(--fg-primary)] shadow-[0_14px_34px_rgba(99,102,241,0.16)]"
                  : "text-[color:color-mix(in_srgb,var(--fg-primary)_82%,transparent)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--fg-primary)]",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", active ? "border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--accent-electric)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:color-mix(in_srgb,var(--fg-primary)_80%,transparent)] group-hover:border-[color:var(--border-strong)] group-hover:bg-[color:var(--surface-strong)] group-hover:text-[color:var(--accent-electric)]")}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.name}
            </button>
          );
        })}
          </nav>
        </div>
      </div>

      <div className="border-t border-[color:var(--border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-sm font-semibold text-[color:var(--fg-primary)] ring-1 ring-[color:var(--border)]">
            S
          </div>
          <div>
            <p className="text-sm font-medium text-[color:var(--fg-primary)]">Surya Krishna</p>
            <p className="text-xs text-[color:var(--fg-secondary)]">Hostel Owner</p>
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--border)] px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-2xl bg-[linear-gradient(90deg,var(--error)_0%,var(--cta-strong)_100%)] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_14px_28px_color-mix(in_srgb,var(--error)_22%,transparent)] transition hover:opacity-95"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}
