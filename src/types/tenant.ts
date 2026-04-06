export type TenantRecord = {
  tenantId: string;
  fullName: string;
  phone: string;
  email: string;
  monthlyRent: number;
  rentPaid: number;
  paidOnDate: string;
  billingAnchorDate: string;
  nextDueDate: string;
  idNumber: string;
  idImageName: string;
  emergencyContact: string;
  createdAt: string;
  assignment?: TenantAssignment;
  paymentHistory: TenantPaymentHistory[];
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
  hostelName: string;
  floorNumber: number;
  roomNumber: string;
  sharingType: string;
  moveInDate: string;
};

export type HostelRoom = {
  id?: string;
  roomNumber: string;
  capacity: number;
  occupied: number;
  sharingType?: string;
};

export type HostelFloor = {
  id?: string;
  floorNumber: number;
  rooms: HostelRoom[];
};

export type HostelRoomInventory = {
  hostelId: string;
  hostelName: string;
  floors: HostelFloor[];
};
