export const PENDING_ID_NUMBER = "PENDING-ID";

export type BillingCycle = "daily" | "weekly" | "monthly";

export type TenantDiscount = {
  type: "fixed" | "percent";
  value: number;          // ₹ amount (fixed) or % (percent)
  monthsTotal: number;    // total months to apply discount
  monthsUsed: number;     // months already applied
  note?: string;
  appliedAt: string;      // YYYY-MM-DD
};

export type TenantPendingBalance = {
  amount: number;          // remaining balance owed
  originalRent: number;    // full rent that was due that cycle
  partialPaidDate: string; // date partial payment was made
  deferredTo?: string;     // optional reminder date YYYY-MM-DD
  note?: string;
};

export type IdType = "aadhar" | "pan" | "driving_licence" | "other";

export type EmergencyRelation = "father" | "mother" | "brother" | "sister" | "spouse" | "friend" | "other";

export type OccupationType = "employed" | "student" | "self_employed" | "other";

export type TenantRecord = {
  tenantId: string;
  hostelId?: string;
  fullName: string;
  fatherName?: string;
  dateOfBirth?: string;
  phone: string;
  email: string;
  occupation?: OccupationType;
  workplaceName?: string;
  tenantPhotoUrl?: string;
  idPhotoUrl?: string;
  agreementUrls?: string[];
  monthlyRent: number;
  rentPaid: number;
  advanceAmount?: number;
  serviceFeeAmount?: number;
  advanceBalance?: number;
  serviceFeeCollected?: number;
  paidOnDate: string;
  billingAnchorDate: string;
  nextDueDate: string;
  billingCycle?: BillingCycle;
  idType?: IdType;
  idNumber: string;
  emergencyContactName?: string;
  emergencyContactRelation?: EmergencyRelation;
  emergencyContactPhone?: string;
  familyMembers?: TenantFamilyMember[];
  createdAt: string;
  updatedAt: string;
  assignment?: TenantAssignment;
  paymentHistory: TenantPaymentHistory[];
  activeDiscount?: TenantDiscount;
  pendingBalance?: TenantPendingBalance;
};

export type TenantFamilyMember = {
  name: string;
  relation: string;
  age?: number;
};

export type TenantPaymentHistory = {
  paymentId: string;
  amount: number;
  paidOnDate: string;
  nextDueDate: string;
  status: "active" | "due-soon" | "overdue";
  paymentMethod: "cash" | "online";
  txnId?: string;
  proofImageName?: string;
  proofImageUrl?: string;
  proofMimeType?: string;
  isPartial?: boolean;         // true = partial; balance deferred
  discountAmount?: number;     // ₹ discount applied this payment
  note?: string;               // balance-collection note or other memo
};

export type TenantAssignment = {
  hostelId: string;
  hostelName?: string;
  roomNumber?: string;
  unitId?: string;
  sharingType?: string;
  moveInDate?: string;
  propertyType?: "PG" | "RESIDENCE";
  bedId?: string;
  bedLabel?: string;
};

export type HostelBed = {
  id: string;
  label: string;
  occupied: boolean;
  tenantId?: string;
  tenantName?: string;
};

export type HostelRoom = {
  id?: string;
  unitId?: string;
  roomNumber: string;
  capacity: number;
  occupied: number;
  sharingType?: string;
  propertyType?: "PG" | "RESIDENCE";
  beds?: HostelBed[];
};

export type HostelRoomInventory = {
  hostelId: string;
  hostelName: string;
  type: "PG" | "RESIDENCE";
  rooms: HostelRoom[];
};
