 "use client";

import { useState } from "react";
import { OwnerSidebar } from "@/components/owner-sidebar";
import { OwnerTopbar } from "@/components/owner-topbar";
import { HostelContextProvider } from "@/components/hostel-context-provider";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HostelContextProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f4eefb_0%,#efe7fb_32%,#f7f3ff_66%,#faf7ff_100%)] lg:flex">
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <OwnerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="animate-[float-up_360ms_ease] px-3 py-4 sm:px-4 md:px-6 md:py-5">{children}</main>
        </div>
      </div>
    </HostelContextProvider>
  );
}
