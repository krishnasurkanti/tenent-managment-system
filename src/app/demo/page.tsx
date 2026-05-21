"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/demo-login", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.ok) router.push("/owner/dashboard"); })
      .catch(() => router.push("/owner/dashboard"));
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#09090b]">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white mx-auto mb-4" />
        <p className="text-sm text-white/50">Starting demo…</p>
      </div>
    </div>
  );
}
