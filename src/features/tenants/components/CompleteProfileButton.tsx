"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { TenantRecord } from "@/types/tenant";

export function CompleteProfileButton({ tenant }: { tenant: TenantRecord }) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color:var(--warning-soft)] px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
        <div>
          <p className="text-sm font-semibold text-[color:var(--warning)]">Profile incomplete</p>
          <p className="mt-0.5 text-[12px] text-[color:var(--fg-secondary)]">
            Missing: {[!tenant.phone && "phone", !tenant.idType && "ID type", !tenant.idPhotoUrl && "ID photo"].filter(Boolean).join(", ")}.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/owner/tenants/${tenant.tenantId}/complete-profile`)}
        className="shrink-0 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color:var(--warning-soft)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--warning)] transition hover:brightness-110"
      >
        Complete Profile
      </button>
    </div>
  );
}
