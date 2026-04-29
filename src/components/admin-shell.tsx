"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, LogOut, Settings, Wallet } from "lucide-react";
import { logoutAdmin } from "@/services/auth/auth.service";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/utils/cn";

const nav = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Hostels",   href: "/admin/hostels",   icon: Building2        },
  { name: "Billing",   href: "/admin/billing",   icon: Wallet           },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3        },
  { name: "Settings",  href: "/admin/settings",  icon: Settings         },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    /*
      app-shell on desktop = flex-row: sidebar sits left, main column fills right.
      On mobile: flex-col — top nav bar replaces sidebar.
    */
    <div className="app-shell bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-surface)_38%,var(--bg-elevated)_100%)] text-[color:var(--fg-primary)] lg:flex-row">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden h-full w-[var(--sidebar-w)] shrink-0 flex-col border-r border-[color:var(--border)] bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-primary)_100%)] lg:flex">
        <div className="border-b border-[color:var(--border)] px-4 py-4">
          <p className="text-base font-bold tracking-tight text-[color:var(--fg-primary)]">MyPG Control</p>
          <p className="text-[11px] text-[color:var(--fg-secondary)]">Super Admin</p>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-pill)] px-3 py-2 text-[13px] font-medium transition",
                    active
                      ? "bg-[color:var(--brand-soft)] text-[color:var(--fg-primary)] shadow-[0_8px_20px_rgba(99,102,241,0.12)]"
                      : "text-[color:var(--fg-secondary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-[color:var(--border)] px-3 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-[var(--radius-pill)] px-3 py-2 text-[13px] font-medium text-[color:var(--fg-secondary)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--error)]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="app-main-col">

        {/* Top header — title + logout, always visible */}
        <header
          className="app-topbar flex items-center justify-between border-b border-[color:var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bg-surface)_90%,white)_0%,var(--bg-surface)_100%)] px-4 shadow-sm backdrop-blur-xl"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Platform Owner</p>
            <p className="text-[13px] font-semibold text-[color:var(--fg-primary)]">Admin Console</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center gap-1.5 rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--fg-primary)] transition hover:border-[color:var(--error)] hover:text-[color:var(--error)] lg:inline-flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </header>

        {/* Mobile tab nav — replaces sidebar on small screens */}
        <nav className="grid grid-cols-5 gap-1 border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1 lg:hidden">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-2 text-[10px] font-semibold transition",
                  active
                    ? "bg-[color:var(--surface-strong)] text-[color:var(--accent)]"
                    : "text-[color:var(--fg-secondary)]",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/*
          app-scroll: single scroll surface.
          No bottom nav on admin, so pb-4 is enough.
        */}
        <main className="app-scroll app-scroll-fade px-3 py-3 sm:px-4 lg:px-5 lg:py-4">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col page-enter">
            <ErrorBoundary message="This page failed to load. Try refreshing.">
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
