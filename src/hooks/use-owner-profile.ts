"use client";

import { useQuery } from "@tanstack/react-query";

type OwnerProfile = { name?: string; email?: string };

export function useOwnerProfile(): OwnerProfile {
  const { data } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: async () => {
      const res = await fetch("/api/owner/profile", { cache: "no-store" });
      const payload = (await res.json()) as { owner?: OwnerProfile };
      return payload.owner ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });

  return data ?? {};
}
