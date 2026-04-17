"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, LogOut, Settings, Wallet } from "lucide-react";
import { logoutAdmin } from "@/services/auth/auth.service";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/utils/cn";

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
    await logoutAdmin();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="smart-scroll-shell bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-surface)_38%,var(--bg-elevated)_100%)] text-[color:var(--fg-primary)]">
      <div className="mx-auto flex min-h-full w-full max-w-[1400px]">
        <aside className="hidden h-full w-[260px] shrink-0 border-r border-[color:var(--border)] bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-primary)_100%)] p-4 shadow-[0_24px_50px_rgba(0,0,0,0.18)] lg:block">
          <div className="mb-5 rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--bg-elevated)_0%,color-mix(in_srgb,var(--bg-surface)_72%,black)_100%)] px-3 py-3">
            <p className="text-xl font-bold tracking-tight text-[color:var(--fg-primary)]">MyPG Control</p>
            <p className="text-xs text-[color:var(--fg-secondary)]">Super Admin Center</p>
          </div>
          <nav className="space-y-1.5">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[20px] px-3 py-2.5 text-sm font-medium transition",
                    active ? "bg-[linear-gradient(90deg,var(--brand-soft)_0%,var(--success-soft)_100%)] text-[color:var(--fg-primary)] shadow-[0_12px_28px_rgba(99,102,241,0.14)]" : "text-[color:var(--fg-secondary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:p-4">
          <header className="smart-scroll-header mb-2.5 flex items-center justify-between rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bg-surface)_90%,white)_0%,var(--bg-surface)_100%)] px-4 py-3 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Platform Owner</p>
              <p className="text-sm font-semibold text-[color:var(--fg-primary)]">Admin Profile</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[color:var(--fg-primary)]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </header>
          <main className="smart-scroll-area smart-scroll-fade pr-1">
            <div className="app-page-frame flex min-h-full flex-col">
              <ErrorBoundary message="This page failed to load. Try refreshing.">
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
