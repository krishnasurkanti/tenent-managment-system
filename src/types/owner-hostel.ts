export type OwnerRoom = {
  id: string;
  roomNumber: string;
  bedCount: number;
  sharingType: string;
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
  floors: OwnerFloor[];
  createdAt: string;
};
