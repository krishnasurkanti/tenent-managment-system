export type AdminPlanId = "starter" | "growth" | "pro" | "scale";

export type AdminPlan = {
  id: AdminPlanId;
  name: string;
  basePrice: number;
  limit: number;
};

export type PaymentStatus = "paid" | "pending" | "failed";

export type AdminHostelControl = {
  hostelId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerUsername: string;
  ownerPasswordHash: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  ownerSuspended: boolean;
  hostelActive: boolean;
  planId: AdminPlanId;
  pricingOverride: number | null;
  discountPercent: number;
  freeMonthsRemaining: number;
  autoPayEnabled: boolean;
};

export type BillingBreakdown = {
  tenantCount: number;
  billableTenantCount: number;
  extraTenants: number;
  extraCharges: number;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  upgradeSuggested: boolean;
  blockedAtNextPlan: boolean;
  nextPlanName: string | null;
};

export type AdminInvoice = {
  invoiceId: string;
  hostelId: string;
  monthKey: string;
  planId: AdminPlanId;
  tenantCount: number;
  billableTenantCount: number;
  extraCharges: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

export type AdminLog = {
  id: string;
  createdAt: string;
  actor: "super_admin";
  event: string;
  detail: string;
};

export type UpgradeRequest = {
  requestId: string;
  hostelId: string;
  hostelName: string;
  currentPlanId: AdminPlanId;
  requestedPlanId: AdminPlanId;
  note: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  decidedAt?: string;
};
