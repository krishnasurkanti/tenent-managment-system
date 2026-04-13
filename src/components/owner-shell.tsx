 "use client";

import { useState } from "react";
import { OwnerMobileNav } from "@/components/owner-mobile-nav";
import { OwnerSidebar } from "@/components/owner-sidebar";
import { OwnerTopbar } from "@/components/owner-topbar";
import { HostelContextProvider } from "@/components/hostel-context-provider";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HostelContextProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_48%,#f8fafc_100%)] lg:flex">
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <OwnerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="animate-[float-up_360ms_ease] px-3 py-3 pb-24 sm:px-4 md:px-5 md:py-5 md:pb-6 xl:px-6">{children}</main>
        </div>
        <OwnerMobileNav />
      </div>
    </HostelContextProvider>
  );
}
