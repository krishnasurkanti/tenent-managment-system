import type { OwnerHostel } from "@/types/owner-hostel";
import type { HostelRoomInventory } from "@/types/tenant";

export const DEMO_OWNER_HOSTEL_ID = "owner-hostel-demo";

const demoOwnerHostels: OwnerHostel[] = [
  {
    id: DEMO_OWNER_HOSTEL_ID,
    hostelName: "Test Residency",
    address: "Madhapur Main Road, Hyderabad",
    createdAt: "2026-04-01T10:00:00.000Z",
    floors: [
      {
        id: "floor-demo-1",
        floorLabel: "Floor 1",
        rooms: [
          { id: "room-demo-101", roomNumber: "101", bedCount: 3, sharingType: "3 sharing" },
          { id: "room-demo-102", roomNumber: "102", bedCount: 2, sharingType: "2 sharing" },
        ],
      },
      {
        id: "floor-demo-2",
        floorLabel: "Floor 2",
        rooms: [
          { id: "room-demo-201", roomNumber: "201", bedCount: 1, sharingType: "Single sharing" },
          { id: "room-demo-202", roomNumber: "202", bedCount: 4, sharingType: "4 sharing" },
        ],
      },
    ],
  },
];

let ownerHostels: OwnerHostel[] = getDemoOwnerHostels();

function cloneHostel(hostel: OwnerHostel): OwnerHostel {
  return {
    ...hostel,
    floors: hostel.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({ ...room })),
    })),
  };
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
  const nextHostel: OwnerHostel = {
    id: `owner-hostel-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...hostel,
  };

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

export function getOwnerHostelInventory(): HostelRoomInventory[] {
  return ownerHostels.map((hostel) => ({
    hostelId: hostel.id,
    hostelName: hostel.hostelName,
    floors: hostel.floors.map((floor, floorIndex) => ({
      id: floor.id,
      floorNumber: floorIndex + 1,
      rooms: floor.rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        capacity: room.bedCount,
        occupied: 0,
        sharingType: room.sharingType,
      })),
    })),
  }));
}
