import type { TenantRecord } from "@/types/tenant";

export type TenantBillingResult = {
  tenantId: string;
  activeDays: number;
  billable: boolean;
};

/**
 * activeDays = max(moveIn, cycleStart) → min(moveOut || today, cycleEnd)
 * Returns 0 if the ranges don't overlap.
 *
 * All params: YYYY-MM-DD strings.
 */
export function calculateActiveDays(
  moveInDate: string,
  moveOutDate: string | null | undefined,
  cycleStart: string,
  cycleEnd: string,
): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const moveIn  = new Date(moveInDate  + "T00:00:00Z");
  const moveOut = moveOutDate ? new Date(moveOutDate + "T00:00:00Z") : today;
  const cStart  = new Date(cycleStart  + "T00:00:00Z");
  const cEnd    = new Date(cycleEnd    + "T00:00:00Z");

  const windowStart = moveIn  > cStart ? moveIn  : cStart;
  const windowEnd   = moveOut < cEnd   ? moveOut : cEnd;

  if (windowEnd <= windowStart) return 0;
  return Math.floor((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Computes billing eligibility for a list of tenants in a given cycle window.
 *
 * Rules:
 *   - Only monthly tenants (billingCycle === "monthly" or undefined) are evaluated.
 *   - activeDays > 10  → billable: true
 *   - activeDays ≤ 10  → billable: false (not billed this cycle)
 *
 * @param tenants     Array of TenantRecord for the hostel
 * @param cycleStart  Owner billing cycle start date (YYYY-MM-DD)
 * @param cycleEnd    Owner billing cycle end date   (YYYY-MM-DD)
 */
export function computeBillingEligibility(
  tenants: TenantRecord[],
  cycleStart: string,
  cycleEnd: string,
): TenantBillingResult[] {
  return tenants
    .filter((t) => !t.billingCycle || t.billingCycle === "monthly")
    .map((t) => {
      const moveInDate = t.assignment?.moveInDate;
      if (!moveInDate) {
        return { tenantId: t.tenantId, activeDays: 0, billable: false };
      }

      // moveOutDate not on the type yet — safe fallback to null (= today)
      const moveOutDate = (t as { moveOutDate?: string }).moveOutDate ?? null;
      const activeDays  = calculateActiveDays(moveInDate, moveOutDate, cycleStart, cycleEnd);

      return { tenantId: t.tenantId, activeDays, billable: activeDays > 10 };
    });
}

/**
 * Returns only billable tenants (activeDays > 10).
 */
export function getBillableTenants(
  tenants: TenantRecord[],
  cycleStart: string,
  cycleEnd: string,
): TenantBillingResult[] {
  return computeBillingEligibility(tenants, cycleStart, cycleEnd).filter((t) => t.billable);
}

/**
 * Count of billable tenants — use this as the effective tenant count for invoicing.
 */
export function getBillableTenantCount(
  tenants: TenantRecord[],
  cycleStart: string,
  cycleEnd: string,
): number {
  return getBillableTenants(tenants, cycleStart, cycleEnd).length;
}
