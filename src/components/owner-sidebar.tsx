"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[248px] shrink-0 bg-[radial-gradient(circle_at_top,#11233f_0%,#0b172a_52%,#081220_100%)] text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-[18px] bg-violet-500/18 p-2.5 text-violet-200 ring-1 ring-white/10">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[1.9rem] font-bold tracking-tight leading-none">
              Hostel<span className="text-violet-400">Hub</span>
            </p>
            <p className="mt-1 text-xs text-slate-300">Management System</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-5">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
          <nav className="space-y-1.5">
        {workspaceNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-[13px] font-medium transition",
                active
                  ? "bg-[linear-gradient(135deg,#8b5cf6_0%,#6d28d9_100%)] text-white shadow-[0_12px_24px_rgba(109,40,217,0.32)]"
                  : "text-slate-200 hover:bg-white/8 hover:text-white",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", active ? "border-white/10 bg-white/10" : "border-white/5 bg-white/5 group-hover:border-white/10 group-hover:bg-white/10")}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.name}
            </Link>
          );
        })}
          </nav>
        </div>

        <div className="mb-5">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Hostel</p>
          <nav className="space-y-1.5">
        {hostelNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-[13px] font-medium transition",
                active
                  ? "bg-[linear-gradient(135deg,#8b5cf6_0%,#6d28d9_100%)] text-white shadow-[0_12px_24px_rgba(109,40,217,0.32)]"
                  : "text-slate-200 hover:bg-white/8 hover:text-white",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border transition", active ? "border-white/10 bg-white/10" : "border-white/5 bg-white/5 group-hover:border-white/10 group-hover:bg-white/10")}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.name}
            </Link>
          );
        })}
          </nav>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.3),rgba(255,255,255,0.03))] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live vibe</p>
              <p className="mt-1 text-sm font-semibold text-white">Smart workspace</p>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Active
            </span>
          </div>
          <HostelMiniScene className="mt-4 h-auto w-full" />
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
            S
          </div>
          <div>
            <p className="text-sm font-medium">Surya Krishna</p>
            <p className="text-xs text-slate-300">Hostel Owner</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/login"
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-200 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
