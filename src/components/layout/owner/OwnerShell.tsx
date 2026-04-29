"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { OwnerMobileNav } from "@/components/layout/owner/OwnerMobileNav";
import { OwnerSidebar } from "@/components/layout/owner/OwnerSidebar";
import { OwnerTopbar } from "@/components/layout/owner/OwnerTopbar";
import { HostelContextProvider } from "@/store/hostel-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const PUBLIC_PATHS = ["/owner/login", "/owner/accept-invite", "/owner/signup"];
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "?"))) {
    return <>{children}</>;
  }

  return (
    <HostelContextProvider>
      {/* app-shell: 100dvh, overflow hidden, flex-col on mobile, flex-row on desktop */}
      <div className="app-shell relative bg-[linear-gradient(180deg,var(--bg-primary)_0%,#0f1a2e_50%,#0b1220_100%)] lg:flex-row">

        {/* Ambient glow — pointer-events-none so it never blocks interaction */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-[-6rem] top-[-4rem] h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--glow-accent)_0%,transparent_70%)] blur-3xl animate-[panel-glow_9s_ease-in-out_infinite]" />
          <div className="absolute right-[-5rem] top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--glow-brand)_0%,transparent_72%)] blur-3xl animate-[panel-glow_11s_ease-in-out_infinite]" />
        </div>

        {/* Sidebar — slides in on mobile, static on desktop */}
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main column: topbar + scroll area */}
        <div className="app-main-col relative z-10">
          <Suspense fallback={<OwnerTopbarFallback />}>
            <div className="app-topbar">
              <OwnerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
            </div>
          </Suspense>

          {/*
            app-scroll: the ONLY scrolling element.
            Horizontal padding applied here once — pages don't re-add it.
            Bottom padding = nav height + safe area + small gap, so content
            is never hidden behind the mobile bottom nav.
          */}
          <main
            className="app-scroll app-scroll-fade px-3 pt-2.5 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom,0px)+0.625rem)] sm:px-4 sm:pt-3 md:px-5 xl:px-6 xl:py-4 xl:pb-6"
          >
            <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col page-enter">
              <ErrorBoundary message="This page failed to load. Try refreshing.">
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Bottom nav — only visible on < xl */}
        <OwnerMobileNav />
      </div>
    </HostelContextProvider>
  );
}

function OwnerTopbarFallback() {
  return (
    <div
      className="border-b border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.84)_100%)] px-3 py-2 backdrop-blur-2xl md:px-4 xl:px-5"
      style={{ height: "var(--topbar-h)" }}
    >
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
          <div className="hidden h-8 w-36 animate-pulse rounded-full bg-[color:var(--surface-soft)] xl:block" />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-8 w-64 animate-pulse rounded-full bg-[color:var(--surface-soft)] xl:block" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
        </div>
      </div>
    </div>
  );
}
