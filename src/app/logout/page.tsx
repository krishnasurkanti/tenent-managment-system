"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" })
      .finally(() => {
        // L-06 fix: clear tenant form draft so stale data doesn't pre-fill after re-login
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("tenant-form-draft-v5");
          window.localStorage.removeItem("currentHostelId");
        }
        router.replace("/login");
      });
  }, [router]);

  return null;
}
