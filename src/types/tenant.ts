export const PENDING_ID_NUMBER = "PENDING-ID";

export type BillingCycle = "daily" | "weekly" | "monthly";

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
  agreementUrl?: string;
  monthlyRent: number;
  rentPaid: number;
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
