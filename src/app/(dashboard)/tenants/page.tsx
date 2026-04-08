"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function LegacyTenantsPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <LegacyTenantsRedirect />
    </Suspense>
  );
}

function LegacyTenantsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/owner/tenants?${query}` : "/owner/tenants");
  }, [router, searchParams]);

  return <LoadingCard />;
}

function LoadingCard() {
  return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Opening tenant form...</Card>;
}
