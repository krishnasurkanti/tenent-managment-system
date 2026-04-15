"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchOwnerHostels } from "@/services/owner/owner-hostels.service";
import type { OwnerHostel } from "@/types/owner-hostel";

const STORAGE_KEY = "currentHostelId";

type HostelContextValue = {
  hostels: OwnerHostel[];
  currentHostelId: string | null;
  currentHostel: OwnerHostel | null;
  loading: boolean;
  isSwitching: boolean;
  refreshHostels: () => Promise<void>;
  selectHostel: (hostelId: string) => void;
};

const HostelContext = createContext<HostelContextValue | null>(null);

export function HostelContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hostels, setHostels] = useState<OwnerHostel[]>([]);
  const [currentHostelId, setCurrentHostelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const refreshHostels = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await fetchOwnerHostels();
      const nextHostels = data.hostels ?? [];

      setHostels(nextHostels);

      const storedHostelId = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const preferredId = currentHostelId ?? storedHostelId;
      const fallbackHostel = nextHostels.find((hostel) => hostel.id === preferredId) ?? nextHostels[0] ?? null;
      const nextHostelId = fallbackHostel?.id ?? null;

      setCurrentHostelId(nextHostelId);

      if (typeof window !== "undefined") {
        if (nextHostelId) {
          window.localStorage.setItem(STORAGE_KEY, nextHostelId);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentHostelId]);

  useEffect(() => {
    refreshHostels();
  }, [refreshHostels]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (hostels.length && pathname === "/owner/create-hostel") {
      const mode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : null;

      if (mode !== "edit") {
        return;
      }
    }
  }, [hostels, loading, pathname, router]);

  const selectHostel = useCallback((hostelId: string) => {
    setIsSwitching(true);

    startTransition(() => {
      setCurrentHostelId(hostelId);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, hostelId);
      }
    });

    window.setTimeout(() => {
      setIsSwitching(false);
    }, 220);
  }, []);

  const currentHostel = useMemo(
    () => hostels.find((hostel) => hostel.id === currentHostelId) ?? hostels[0] ?? null,
    [currentHostelId, hostels],
  );

  const value = useMemo(
    () => ({
      hostels,
      currentHostelId: currentHostel?.id ?? null,
      currentHostel,
      loading,
      isSwitching,
      refreshHostels,
      selectHostel,
    }),
    [currentHostel, hostels, isSwitching, loading, refreshHostels, selectHostel],
  );

  return <HostelContext.Provider value={value}>{children}</HostelContext.Provider>;
}

export function useHostelContext() {
  const context = useContext(HostelContext);

  if (!context) {
    throw new Error("useHostelContext must be used within HostelContextProvider.");
  }

  return context;
}
