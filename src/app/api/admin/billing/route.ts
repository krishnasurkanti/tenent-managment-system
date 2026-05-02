import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

type PlanSlab = { id?: string; label?: string; price?: number; limit: number | null; base?: number; extra_per_tenant: number };

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const response = await backendFetch("/api/admin/billing/owners");
  if (!response.ok) {
    const payload = (await response.json()) as unknown;
    return NextResponse.json(payload, { status: response.status });
  }

  const { owners, plans } = (await response.json()) as {
    owners: Array<{
      id: number;
      name: string;
      plan: string;
      free_months_remaining: number;
      hostel_count: number;
      tenant_count: number;
      latest_invoice_id: number | null;
      latest_invoice_status: string | null;
      latest_invoice_amount: string | null;
    }>;
    plans: PlanSlab[] | Record<string, PlanSlab>;
  };

  const planMap = Array.isArray(plans)
    ? Object.fromEntries(plans.map((plan) => [plan.id, plan]))
    : plans;

  const summary = owners.map((owner) => {
    const planId = owner.plan ?? "starter";
    const slab: PlanSlab = planMap[planId] ?? planMap["starter"] ?? { limit: 50, price: 299, extra_per_tenant: 10 };
    const planLimit = slab.limit ?? Infinity;
    const tenantCount = owner.tenant_count ?? 0;
    const freeMonths = owner.free_months_remaining ?? 0;
    const extraTenants = planLimit === Infinity ? 0 : Math.max(0, tenantCount - planLimit);
    const extraCharges = extraTenants * (slab.extra_per_tenant ?? 10);
    const baseAmount = slab.base ?? slab.price ?? 0;
    const finalAmount = freeMonths > 0 ? 0 : baseAmount + extraCharges;

    return {
      hostelId: String(owner.id),
      hostelName: owner.name,
      plan: {
        id: planId,
        name: slab.label ?? planId,
        basePrice: baseAmount,
        limit: slab.limit ?? 0,
      },
      control: {
        planId,
        pricingOverride: null,
        discountPercent: 0,
        freeMonthsRemaining: freeMonths,
      },
      billing: {
        tenantCount,
        billableTenantCount: tenantCount,
        planLimit: planLimit === Infinity ? 0 : planLimit,
        extraTenants,
        extraCharges,
        hostelCount: owner.hostel_count ?? 0,
        hostelLimit: 0,
        extraHostels: 0,
        hostelExtraCharges: 0,
        baseAmount,
        discountAmount: 0,
        finalAmount,
        upgradeSuggested: false,
        blockedAtNextPlan: false,
        nextPlanName: null,
      },
    };
  });

  const history = owners
    .filter((o) => o.latest_invoice_id != null)
    .map((o) => ({
      invoiceId: String(o.latest_invoice_id),
      hostelId: String(o.id),
      monthKey: new Date().toISOString().slice(0, 7),
      finalAmount: Number(o.latest_invoice_amount) || 0,
      paymentStatus: o.latest_invoice_status === "paid" ? "paid" : "pending",
    }));

  return NextResponse.json({ summary, history });
}
