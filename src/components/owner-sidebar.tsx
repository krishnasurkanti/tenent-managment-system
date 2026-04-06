"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  BedDouble,
  Building2,
  CreditCard,
  PencilLine,
  LayoutDashboard,
  LogOut,
  Settings,
  SquarePlus,
  Users,
} from "lucide-react";
import { HostelMiniScene } from "@/components/hostel-mini-scene";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";

const workspaceNavigation = [
  { name: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { name: "Rooms", href: "/owner/rooms", icon: BedDouble },
  { name: "Tenants", href: "/owner/tenants", icon: Users },
  { name: "Payments", href: "/owner/payments", icon: CreditCard },
];

const hostelNavigation = [
  { name: "Edit Hostel", href: "/owner/create-hostel?mode=edit", icon: PencilLine },
  { name: "Add Another Hostel", href: "/owner/create-hostel", icon: SquarePlus },
  { name: "Settings", href: "/owner/settings", icon: Settings },
];

export function OwnerSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  useLockBodyScroll(open);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("currentHostelId");
    }
    onClose();
    router.push("/login");
    router.refresh();
  };

  const handleNavigate = () => {
    onClose();
  };

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/45 transition lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex min-h-screen w-[288px] max-w-[84vw] flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(243,235,255,0.96)_100%)] text-slate-800 shadow-[0_24px_60px_rgba(164,140,255,0.28)] backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:w-[248px] lg:max-w-none lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="border-b border-white/70 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="rounded-[18px] bg-[var(--pill-gradient)] p-2.5 text-violet-700 ring-1 ring-white/60">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[1.9rem] font-bold tracking-tight leading-none text-slate-800">
              Hostel<span className="text-violet-500">Hub</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Management System</p>
          </div>
        </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-xl border border-white/70 bg-white/60 p-2 text-slate-500 transition hover:bg-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-5">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace</p>
          <nav className="space-y-1.5">
        {workspaceNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-[13px] font-medium transition",
                active
                  ? "bg-[var(--action-gradient)] text-white shadow-[var(--shadow-soft)]"
                  : "text-slate-700 hover:bg-[var(--pill-gradient)] hover:text-slate-900",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", active ? "border-white/20 bg-white/15" : "border-white/60 bg-white/60 group-hover:border-white/80 group-hover:bg-white/80")}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.name}
            </Link>
          );
        })}
          </nav>
        </div>

        <div className="mb-5">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Hostel</p>
          <nav className="space-y-1.5">
        {hostelNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-[13px] font-medium transition",
                active
                  ? "bg-[var(--action-gradient)] text-white shadow-[var(--shadow-soft)]"
                  : "text-slate-700 hover:bg-[var(--pill-gradient)] hover:text-slate-900",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", active ? "border-white/20 bg-white/15" : "border-white/60 bg-white/60 group-hover:border-white/80 group-hover:bg-white/80")}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.name}
            </Link>
          );
        })}
          </nav>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/70 bg-[var(--surface-gradient)] px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live vibe</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Smart workspace</p>
            </div>
            <span className="rounded-full bg-[linear-gradient(90deg,#80ddb7_0%,#65d0cf_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
              Active
            </span>
          </div>
          <HostelMiniScene className="mt-4 h-auto w-full" />
        </div>
      </div>

      <div className="border-t border-white/70 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pill-gradient)] text-sm font-semibold text-violet-700">
            S
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Surya Krishna</p>
            <p className="text-xs text-slate-500">Hostel Owner</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/70 px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-[var(--pill-gradient)] hover:text-slate-900"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}
