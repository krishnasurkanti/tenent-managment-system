import type { OwnerHostel } from "@/types/owner-hostel";
import type { HostelRoomInventory } from "@/types/tenant";

export const DEMO_OWNER_HOSTEL_ID = "owner-hostel-demo";

const demoOwnerHostels: OwnerHostel[] = [];

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
