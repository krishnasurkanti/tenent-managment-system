"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { TenantRecord } from "@/types/tenant";

export function CompleteProfileButton({ tenant }: { tenant: TenantRecord }) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/[0.08] px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
        <div>
          <p className="text-sm font-semibold text-orange-300">Profile incomplete</p>
          <p className="mt-0.5 text-[12px] text-orange-300/60">
            Missing: {[!tenant.phone && "phone", !tenant.idType && "ID type", !tenant.idPhotoUrl && "ID photo"].filter(Boolean).join(", ")}.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/owner/tenants/${tenant.tenantId}/complete-profile`)}
        className="shrink-0 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-[12px] font-semibold text-orange-300 transition hover:bg-orange-500/20"
      >
        Complete Profile
      </button>
    </div>
  );
}
