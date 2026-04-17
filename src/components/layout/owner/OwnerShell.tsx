"use client";

import { Suspense, useState } from "react";
import { OwnerMobileNav } from "@/components/layout/owner/OwnerMobileNav";
import { OwnerSidebar } from "@/components/layout/owner/OwnerSidebar";
import { OwnerTopbar } from "@/components/layout/owner/OwnerTopbar";
import { HostelContextProvider } from "@/store/hostel-context";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HostelContextProvider>
      <div className="smart-scroll-shell relative bg-[linear-gradient(180deg,var(--bg-primary)_0%,#132033_42%,#0f172a_100%)] lg:flex lg:flex-row">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--glow-accent)_0%,transparent_70%)] blur-3xl animate-[panel-glow_9s_ease-in-out_infinite]" />
          <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--glow-brand)_0%,transparent_72%)] blur-3xl animate-[panel-glow_11s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(249,193,42,0.08)_0%,transparent_72%)] blur-3xl" />
        </div>
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<OwnerTopbarFallback />}>
            <div className="smart-scroll-header">
              <OwnerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
            </div>
          </Suspense>
          <main className="smart-scroll-area smart-scroll-fade animate-[float-up_var(--motion-large)_var(--ease-enter)] px-2.5 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 xl:px-5 xl:py-4">
            <div className="app-page-frame mx-auto flex w-full max-w-[1380px] flex-1 flex-col">{children}</div>
          </main>
        </div>
        <OwnerMobileNav />
      </div>
    </HostelContextProvider>
  );
}

function OwnerTopbarFallback() {
  return (
    <div className="isolate border-b border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.84)_100%)] px-3 py-2 backdrop-blur-2xl md:px-4 xl:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
          <div className="hidden h-9 w-40 animate-pulse rounded-full bg-[color:var(--surface-soft)] xl:block" />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-9 w-72 animate-pulse rounded-full bg-[color:var(--surface-soft)] xl:block" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-[color:var(--surface-soft)]" />
        </div>
      </div>
    </div>
  );
}
