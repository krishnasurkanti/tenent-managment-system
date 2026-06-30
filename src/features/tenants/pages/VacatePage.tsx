"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { VacateTenantModal } from "@/features/tenants/components/VacateTenantModal";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { SkeletonBlock } from "@/components/ui/skeleton";

export default function VacatePage() {
  return (
    <Suspense fallback={<VacateSkeleton />}>
      <VacatePageContent />
    </Suspense>
  );
}

function VacatePageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { currentHostelId, loading: hostelLoading } = useHostelContext();
  const { tenants, loading: tenantsLoading } = useOwnerTenants(currentHostelId);

  const tenant = tenants.find((t) => t.tenantId === params.id) ?? null;

  const handleClose = () => router.push(`/owner/tenants/${params.id}`);

  const handleRemoved = (tenantId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["owner-tenants"] });
    // Use replace so the vacate page doesn't stay in history for a deleted tenant
    router.replace("/owner/tenants");
  };

  const isLoading = hostelLoading || tenantsLoading;
  if (isLoading) return <VacateSkeleton />;

  if (!tenant) {
    return (
      <div className="space-y-3 pb-8 w-full">
        <button
          type="button"
          onClick={() => router.push("/owner/tenants")}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </button>
        <div className="rounded-[10px] border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-medium text-red-400">Tenant not found.</p>
          <p className="mt-1 text-xs text-white/40">This tenant may have already been removed or belongs to a different hostel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8 w-full">
      <button
        type="button"
        onClick={handleClose}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenant
      </button>

      <VacateTenantModal
        tenant={tenant}
        asPage={true}
        onClose={handleClose}
        onRemoved={handleRemoved}
      />
    </div>
  );
}

function VacateSkeleton() {
  return (
    <div className="space-y-3 pb-8 w-full">
      <SkeletonBlock className="h-8 w-36 rounded-xl" />
      <SkeletonBlock className="h-[520px] rounded-[10px]" />
    </div>
  );
}
