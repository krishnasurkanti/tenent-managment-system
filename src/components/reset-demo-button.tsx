"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch("/api/demo/reset", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to reset demo data.");
      }

      setMessage("Demo hostel and tenants restored.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reset demo data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleReset}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Resetting..." : "Reset Demo Data"}
      </button>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
