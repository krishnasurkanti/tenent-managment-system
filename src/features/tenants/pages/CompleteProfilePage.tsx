"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { CompleteProfileModal } from "@/features/tenants/components/CompleteProfileModal";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { SkeletonBlock } from "@/components/ui/skeleton";
import type { TenantRecord } from "@/types/tenant";

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileSkeleton />}>
      <CompleteProfilePageContent />
    </Suspense>
  );
}

function CompleteProfilePageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { currentHostelId, loading: hostelLoading } = useHostelContext();
  const { tenants, loading: tenantsLoading } = useOwnerTenants(currentHostelId);

  const tenant = tenants.find((t) => t.tenantId === params.id);
  const isLoading = hostelLoading || tenantsLoading;

  const handleClose = () => router.push(`/owner/tenants/${params.id}`);

  const handleSaved = async (updated: TenantRecord) => {
    void queryClient.invalidateQueries({ queryKey: ["owner-tenants", currentHostelId ?? null] });
    router.push(`/owner/tenants/${updated.tenantId}`);
  };

  if (isLoading) return <CompleteProfileSkeleton />;
  if (!tenant) {
    return (
      <div className="mx-auto max-w-lg space-y-3 pb-8">
        <button
          type="button"
          onClick={() => router.push("/owner/tenants")}
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </button>
        <p className="text-sm text-white/50">Tenant not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-8">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.push(`/owner/tenants/${params.id}`)}
        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenant
      </button>

      <CompleteProfileModal
        tenant={tenant}
        allTenants={tenants}
        onClose={handleClose}
        onSaved={handleSaved}
        asPage={true}
      />
    </div>
  );
}

function CompleteProfileSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-3 pb-8">
      <SkeletonBlock className="h-8 w-36 rounded-xl" />
      <SkeletonBlock className="h-[520px] rounded-[10px]" />
    </div>
  );
}
