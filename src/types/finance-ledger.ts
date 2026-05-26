export type FinanceLedgerEntryType =
  | "advance_collected"
  | "service_fee_collected"
  | "advance_refund";

export type FinanceLedgerDirection = "credit" | "debit";

export type FinanceLedgerEntry = {
  id: string;
  ownerId?: string;
  hostelId?: string;
  tenantId: string;
  tenantName: string;
  type: FinanceLedgerEntryType;
  direction: FinanceLedgerDirection;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
};
