 "use client";

import { useState } from "react";
import { OwnerMobileNav } from "@/components/layout/owner/OwnerMobileNav";
import { OwnerSidebar } from "@/components/layout/owner/OwnerSidebar";
import { OwnerTopbar } from "@/components/layout/owner/OwnerTopbar";
import { HostelContextProvider } from "@/store/hostel-context";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HostelContextProvider>
      <div className="relative h-screen overflow-hidden bg-[linear-gradient(180deg,var(--bg-primary)_0%,#132033_42%,#0f172a_100%)] lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--glow-accent)_0%,transparent_70%)] blur-3xl animate-[panel-glow_9s_ease-in-out_infinite]" />
          <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--glow-brand)_0%,transparent_72%)] blur-3xl animate-[panel-glow_11s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(249,193,42,0.08)_0%,transparent_72%)] blur-3xl" />
        </div>
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
          <OwnerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto animate-[float-up_var(--motion-large)_var(--ease-enter)] px-2.5 py-2.5 pb-18 sm:px-3 sm:py-3 md:px-4 md:py-3 xl:px-5">
            <div className="mx-auto w-full max-w-[1380px] pb-2 sm:pb-3">{children}</div>
          </main>
        </div>
        <OwnerMobileNav />
      </div>
    </HostelContextProvider>
  );
}
