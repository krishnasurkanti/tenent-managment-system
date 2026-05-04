"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOwnerTenants } from "@/services/tenants/tenants.service";
import { getOwnerSession } from "@/lib/session-mode";
import type { TenantRecord } from "@/types/tenant";

export function useOwnerTenants(hostelId?: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["owner-tenants", hostelId ?? null],
    queryFn: async () => {
      const { data } = await fetchOwnerTenants(hostelId ?? undefined);
      return (data.tenants ?? []) as TenantRecord[];
    },
    staleTime: 20_000,
    // Ensure queries are isolated per owner session
    refetchOnWindowFocus: false, // Prevent background refetch from overwriting form state
  });

  return { tenants: data ?? [], loading: isLoading };
}
