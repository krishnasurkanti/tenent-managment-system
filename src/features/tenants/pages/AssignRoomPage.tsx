"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { TenantRoomAssignmentModal } from "@/features/tenants/components/TenantRoomAssignmentModal";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { SkeletonBlock } from "@/components/ui/skeleton";
import type { TenantRecord } from "@/types/tenant";

export default function AssignRoomPage() {
  return (
    <Suspense fallback={<AssignRoomSkeleton />}>
      <AssignRoomPageContent />
    </Suspense>
  );
}

function AssignRoomPageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { currentHostelId, loading: hostelLoading } = useHostelContext();
  const { tenants, loading: tenantsLoading } = useOwnerTenants(currentHostelId);

  const tenant = tenants.find((t) => t.tenantId === params.id) ?? null;

  const handleClose = () => router.push(`/owner/tenants/${params.id}`);

  const handleAssigned = async (updated: TenantRecord) => {
    void queryClient.invalidateQueries({ queryKey: ["owner-tenants", currentHostelId ?? null] });
    router.push(`/owner/tenants/${updated.tenantId}`);
  };

  const isLoading = hostelLoading || tenantsLoading;

  if (isLoading) return <AssignRoomSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-3 pb-8">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.push(`/owner/tenants/${params.id}`)}
        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenant
      </button>

      <TenantRoomAssignmentModal
        open={true}
        asPage={true}
        tenant={tenant}
        onClose={handleClose}
        onAssigned={handleAssigned}
      />
    </div>
  );
}

function AssignRoomSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 pb-8">
      <SkeletonBlock className="h-8 w-36 rounded-xl" />
      <SkeletonBlock className="h-[480px] rounded-[10px]" />
    </div>
  );
}
