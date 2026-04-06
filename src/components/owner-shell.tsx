import { OwnerSidebar } from "@/components/owner-sidebar";
import { OwnerTopbar } from "@/components/owner-topbar";
import { HostelContextProvider } from "@/components/hostel-context-provider";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  return (
    <HostelContextProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#eff4fb_0%,#f8fafc_38%,#ffffff_100%)] lg:flex">
        <OwnerSidebar />
        <div className="min-w-0 flex-1">
          <OwnerTopbar />
          <main className="px-3 py-4 md:px-6 md:py-5">{children}</main>
        </div>
      </div>
    </HostelContextProvider>
  );
}
