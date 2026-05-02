export type AdminPlanId = "free" | "starter" | "growth" | "pro";

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
  planLimit: number;
  extraTenants: number;
  extraCharges: number;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  hostelCount: number;
  hostelLimit: number;
  extraHostels: number;
  hostelExtraCharges: number;
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

export type AdminOverview = {
  totals: {
    hostels: number;
    activeTenants: number;
    monthlyRevenue: number;
    activeHostels: number;
    inactiveHostels: number;
  };
  growth: {
    newTenantsThisMonth: number;
    newHostelsThisMonth: number;
    tenantGrowthDelta: number;
  };
};

export type AdminAnalyticsData = {
  tenantsPerHostel: Array<{ hostelName: string; tenantCount: number }>;
  revenuePerHostel: Array<{ hostelName: string; revenue: number }>;
  growthTrends: { monthKey: string; newHostels: number; newTenants: number };
  mostActiveHostels: Array<{ hostelName: string; tenantCount: number }>;
};

export type AdminHostelRow = {
  hostelId: string;
  hostelName: string;
  address: string;
  tenantCount: number;
  owner: {
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    ownerUsername: string;
    failedLoginAttempts: number;
    lockedUntil: string | null;
    ownerSuspended: boolean;
    ownerHostelCount: number;
  };
  status: {
    hostelActive: boolean;
    planId: string;
  };
};

export type AdminBillingRow = {
  hostelId: string;
  hostelName: string;
  plan: { id: string; name: string; basePrice: number; limit: number };
  control: {
    planId: string;
    pricingOverride: number | null;
    discountPercent: number;
    freeMonthsRemaining: number;
  };
  billing: BillingBreakdown;
};

export type AdminSettingsFeatures = Record<string, boolean>;
