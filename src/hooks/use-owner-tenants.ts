"use client";

import { useEffect, useState } from "react";
import { fetchOwnerTenants } from "@/services/tenants/tenants.service";
import type { TenantRecord } from "@/types/tenant";

/**
 * Fetches tenants for a specific hostel and re-fetches when hostelId changes.
 * Pass the current hostelId so only one targeted request is made (avoids N+1).
 */
export function useOwnerTenants(hostelId?: string | null) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadTenants = async () => {
      try {
        const { data } = await fetchOwnerTenants(hostelId ?? undefined);

        if (active) {
          setTenants(data.tenants ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadTenants();

    return () => {
      active = false;
    };
  }, [hostelId]); // re-fetch whenever the selected hostel changes

  return { tenants, loading };
}
