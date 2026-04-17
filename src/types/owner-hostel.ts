export type OwnerRoom = {
  id: string;
  roomNumber: string;
  bedCount: number;
  sharingType: string;
  unitId?: string;
  propertyType?: "PG" | "RESIDENCE";
  beds?: OwnerBed[];
};

export type OwnerBed = {
  id: string;
  label: string;
};

export type OwnerFloor = {
  id: string;
  floorLabel: string;
  rooms: OwnerRoom[];
};

export type OwnerHostel = {
  id: string;
  hostelName: string;
  address: string;
  type: "PG" | "RESIDENCE";
  floors: OwnerFloor[];
  createdAt: string;
};
