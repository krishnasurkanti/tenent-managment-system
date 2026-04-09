"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, LogOut, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Hostels", href: "/admin/hostels", icon: Building2 },
  { name: "Billing", href: "/admin/billing", icon: Wallet },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#f8fafc_38%,#ffffff_100%)]">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(236,253,245,0.78)_100%)] p-4 shadow-[0_24px_50px_rgba(14,165,233,0.08)] lg:block">
          <div className="mb-5 rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
            <p className="text-xl font-bold tracking-tight text-slate-900">MyPG Control</p>
            <p className="text-xs text-slate-500">Super Admin Center</p>
          </div>
          <nav className="space-y-1.5">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active ? "bg-[linear-gradient(90deg,#dbeafe_0%,#dcfce7_100%)] text-slate-900" : "text-slate-700 hover:bg-white/70",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <header className="mb-4 flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Platform Owner</p>
              <p className="text-sm font-semibold text-slate-900">Admin Profile</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
