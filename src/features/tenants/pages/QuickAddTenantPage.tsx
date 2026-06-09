"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QuickAddTenantModal } from "@/features/tenants/components/QuickAddTenantModal";
import { useHostelContext } from "@/store/hostel-context";
import { SkeletonBlock } from "@/components/ui/skeleton";
import type { TenantRecord } from "@/types/tenant";

export default function QuickAddTenantPage() {
  return (
    <Suspense fallback={<QuickAddSkeleton />}>
      <QuickAddTenantPageContent />
    </Suspense>
  );
}

function QuickAddTenantPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentHostel, currentHostelId, loading: hostelLoading } = useHostelContext();

  const handleClose = () => router.push("/owner/tenants");

  const handleCreated = async (tenant: TenantRecord) => {
    void queryClient.invalidateQueries({ queryKey: ["owner-tenants", currentHostelId ?? null] });
    router.push(`/owner/tenants/${tenant.tenantId}`);
  };

  if (hostelLoading) return <QuickAddSkeleton />;

  return (
    <div className="space-y-3 pb-8 px-3 sm:px-4 sm:max-w-lg sm:mx-auto">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.push("/owner/tenants")}
        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-white/50 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants
      </button>

      <QuickAddTenantModal
        open={true}
        asPage={true}
        onClose={handleClose}
        onCreated={handleCreated}
        hostelId={currentHostel?.id}
      />
    </div>
  );
}

function QuickAddSkeleton() {
  return (
    <div className="space-y-3 pb-8 px-3 sm:px-4 sm:max-w-lg sm:mx-auto">
      <SkeletonBlock className="h-8 w-36 rounded-xl" />
      <SkeletonBlock className="h-80 rounded-[10px]" />
    </div>
  );
}
