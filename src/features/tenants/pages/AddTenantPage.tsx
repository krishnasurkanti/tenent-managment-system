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
    // Immediately add the new tenant to the cache so AssignRoomPage can find it.
    // Don't invalidate yet — invalidation triggers a background refetch that may
    // overwrite the optimistic update with stale server data (multi-worker dev mode).
    // AssignRoomPage will invalidate after room assignment completes.
    queryClient.setQueryData<TenantRecord[]>(
      ["owner-tenants", currentHostelId ?? null],
      (old) => [tenant, ...(old ?? [])],
    );
    // Go straight to room assignment after tenant creation
    router.push(`/owner/tenants/${tenant.tenantId}/assign-room`);
  };

  if (hostelLoading) return <AddTenantSkeleton />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 w-full">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.push("/owner/tenants")}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition ml-2"
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
    <div className="space-y-3 pb-8 w-full">
      <SkeletonBlock className="h-8 w-36 rounded-xl" />
      <SkeletonBlock className="h-[600px] rounded-[10px]" />
    </div>
  );
}
