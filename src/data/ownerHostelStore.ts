import type { OwnerHostel } from "@/types/owner-hostel";
import type { HostelRoomInventory, TenantRecord } from "@/types/tenant";
import { buildHostelInventory, normalizeHostel } from "@/utils/hostel-occupancy";

export const DEMO_OWNER_HOSTEL_ID = "owner-hostel-aurora";

function createRooms(prefix: string, floorNumber: number) {
  return [
    {
      id: `room-${prefix}-${floorNumber}01`,
      roomNumber: `${floorNumber}01`,
      bedCount: 3,
      sharingType: "3 sharing",
    },
    {
      id: `room-${prefix}-${floorNumber}02`,
      roomNumber: `${floorNumber}02`,
      bedCount: 2,
      sharingType: "2 sharing",
    },
  ];
}

const demoOwnerHostels: OwnerHostel[] = [
  {
    id: DEMO_OWNER_HOSTEL_ID,
    hostelName: "Aurora Residency",
    address: "Madhapur Main Road, Hyderabad",
    type: "PG",
    createdAt: "2026-04-01T10:00:00.000Z",
    floors: [1, 2, 3, 4].map((floorNumber) => ({
      id: `floor-aurora-${floorNumber}`,
      floorLabel: `Floor ${floorNumber}`,
      rooms: createRooms("aurora", floorNumber),
    })),
  },
  {
    id: "owner-hostel-lotus",
    hostelName: "Lotus Elite Stay",
    address: "Kukatpally Housing Board, Hyderabad",
    type: "PG",
    createdAt: "2026-04-03T10:00:00.000Z",
    floors: [1, 2, 3, 4].map((floorNumber) => ({
      id: `floor-lotus-${floorNumber}`,
      floorLabel: `Floor ${floorNumber}`,
      rooms: createRooms("lotus", floorNumber),
    })),
  },
  {
    id: "owner-hostel-skyline",
    hostelName: "Skyline Comforts",
    address: "Gachibowli Financial District, Hyderabad",
    type: "PG",
    createdAt: "2026-04-05T10:00:00.000Z",
    floors: [1, 2, 3, 4].map((floorNumber) => ({
      id: `floor-skyline-${floorNumber}`,
      floorLabel: `Floor ${floorNumber}`,
      rooms: createRooms("skyline", floorNumber),
    })),
  },
];

let ownerHostels: OwnerHostel[] = getDemoOwnerHostels();

function cloneHostel(hostel: OwnerHostel): OwnerHostel {
  return normalizeHostel({
    ...hostel,
    floors: hostel.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        beds: room.beds?.map((bed) => ({ ...bed })),
      })),
    })),
  });
}

export function getDemoOwnerHostels(): OwnerHostel[] {
  return demoOwnerHostels.map((hostel) => cloneHostel(hostel));
}

export function getOwnerHostels() {
  return ownerHostels.map((hostel) => cloneHostel(hostel));
}

export function getOwnerHostel(hostelId?: string) {
  if (ownerHostels.length === 0) {
    return null;
  }

  const hostel = hostelId
    ? ownerHostels.find((item) => item.id === hostelId)
    : ownerHostels[0];

  return hostel ? cloneHostel(hostel) : null;
}

export function saveOwnerHostel(hostel: Omit<OwnerHostel, "id" | "createdAt">) {
  const nextHostel = normalizeHostel({
    id: `owner-hostel-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...hostel,
  });

  ownerHostels = [nextHostel, ...ownerHostels];
  return cloneHostel(nextHostel);
}

export function updateOwnerHostel(hostel: Omit<OwnerHostel, "id" | "createdAt">, hostelId?: string) {
  const targetId = hostelId ?? ownerHostels[0]?.id;

  if (!targetId) {
    return saveOwnerHostel(hostel);
  }

  let updatedHostel: OwnerHostel | null = null;

  ownerHostels = ownerHostels.map((item) => {
    if (item.id !== targetId) {
      return item;
    }

    updatedHostel = {
      ...item,
      ...hostel,
    };

    return updatedHostel;
  });

  return updatedHostel ? cloneHostel(updatedHostel) : saveOwnerHostel(hostel);
}

export function resetOwnerHostel() {
  ownerHostels = getDemoOwnerHostels();
  return getOwnerHostels();
}

export function getOwnerHostelInventory(tenants: TenantRecord[] = []): HostelRoomInventory[] {
  return ownerHostels.map((hostel) => buildHostelInventory(hostel, tenants));
}
