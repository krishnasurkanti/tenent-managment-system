"use client";

import { useEffect, useState } from "react";
import type { TenantRecord } from "@/types/tenant";

export function useOwnerTenants() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadTenants = async () => {
      try {
        const response = await fetch("/api/tenants", { cache: "no-store" });
        const data = (await response.json()) as { tenants?: TenantRecord[] };

        if (active) {
          setTenants(data.tenants ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTenants();

    return () => {
      active = false;
    };
  }, []);

  return { tenants, loading };
}
