"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { TenantFormModal } from "@/features/tenants/components/TenantFormModal";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { SkeletonBlock } from "@/components/ui/skeleton";
import type { TenantRecord } from "@/types/tenant";

export default function AddTenantPage() {
  return (
    <Suspense fallback={<AddTenantSkeleton />}>
      <AddTenantPageContent />
    </Suspense>
  );
}

function AddTenantPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentHostel, currentHostelId, loading: hostelLoading } = useHostelContext();
  const { tenants: allTenants } = useOwnerTenants(currentHostelId);

  const handleClose = () => router.push("/owner/tenants");

  const handleCreated = async (tenant: TenantRecord) => {
    void queryClient.invalidateQueries({ queryKey: ["owner-tenants", currentHostelId ?? null] });
    // Navigate to the tenant detail page so user can see the new tenant
    router.push(`/owner/tenants/${tenant.tenantId}`);
  };

  if (hostelLoading) return <AddTenantSkeleton />;

  return (
    <div className="space-y-3 pb-8 px-3 sm:px-4 sm:max-w-2xl sm:mx-auto">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.push("/owner/tenants")}
        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants
      </button>

      <TenantFormModal
        open={true}
        asPage={true}
        onClose={handleClose}
        onCreated={handleCreated}
        hostelId={currentHostel?.id}
        propertyType={currentHostel?.type as "PG" | "RESIDENCE" | undefined}
        allTenants={allTenants}
      />
    </div>
  );
}

function AddTenantSkeleton() {
  return (
    <div className="space-y-3 pb-8 px-3 sm:px-4 sm:max-w-2xl sm:mx-auto">
      <SkeletonBlock className="h-8 w-36 rounded-xl" />
      <SkeletonBlock className="h-[600px] rounded-[10px]" />
    </div>
  );
}
