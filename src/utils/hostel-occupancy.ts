import type { OwnerBed, OwnerFloor, OwnerHostel, OwnerRoom } from "@/types/owner-hostel";
import type { HostelBed, HostelRoomInventory, TenantRecord } from "@/types/tenant";

function slugifyRoomLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildUnitId(hostelId: string, floorId: string, room: Pick<OwnerRoom, "id" | "roomNumber">) {
  return room.id || `${hostelId}-${floorId}-${slugifyRoomLabel(room.roomNumber) || "unit"}`;
}

function buildBedId(unitId: string, index: number) {
  return `${unitId}-bed-${index + 1}`;
}

export function getRoomCapacity(type: OwnerHostel["type"], room: Pick<OwnerRoom, "bedCount">) {
  return type === "RESIDENCE" ? 1 : Math.max(room.bedCount, 1);
}

export function normalizeRoom(hostelId: string, floorId: string, type: OwnerHostel["type"], room: OwnerRoom): OwnerRoom {
  const unitId = room.unitId || buildUnitId(hostelId, floorId, room);
  const capacity = getRoomCapacity(type, room);
  const beds: OwnerBed[] =
    type === "PG"
      ? Array.from({ length: capacity }, (_, index) => ({
          id: room.beds?.[index]?.id || buildBedId(unitId, index),
          label: room.beds?.[index]?.label || `Bed ${index + 1}`,
        }))
      : [];

  return {
    ...room,
    unitId,
    bedCount: capacity,
    propertyType: type,
    sharingType: type === "RESIDENCE" ? "Private unit" : room.sharingType || `${capacity} sharing`,
    beds,
  };
}

export function normalizeFloors(hostelId: string, type: OwnerHostel["type"], floors: OwnerFloor[]) {
  return floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) => normalizeRoom(hostelId, floor.id, type, room)),
  }));
}

export function normalizeHostel(hostel: OwnerHostel): OwnerHostel {
  return {
    ...hostel,
    type: hostel.type ?? "PG",
    floors: normalizeFloors(hostel.id, hostel.type ?? "PG", hostel.floors),
  };
}

export function buildHostelInventory(hostel: OwnerHostel, tenants: TenantRecord[] = []): HostelRoomInventory {
  const normalized = normalizeHostel(hostel);

  return {
    hostelId: normalized.id,
    hostelName: normalized.hostelName,
    type: normalized.type,
    floors: normalized.floors.map((floor, floorIndex) => ({
      id: floor.id,
      floorNumber: floorIndex + 1,
      rooms: floor.rooms.map((room) => {
        const roomTenants = tenants.filter(
          (tenant) =>
            tenant.assignment?.hostelId === normalized.id &&
            tenant.assignment.floorNumber === floorIndex + 1 &&
            tenant.assignment.roomNumber === room.roomNumber,
        );

        const beds: HostelBed[] =
          normalized.type === "PG"
            ? (room.beds ?? []).map((bed) => {
                const assignedTenant = roomTenants.find((tenant) => tenant.assignment?.bedId === bed.id);
                return {
                  id: bed.id,
                  label: bed.label,
                  occupied: Boolean(assignedTenant),
                  tenantId: assignedTenant?.tenantId,
                  tenantName: assignedTenant?.fullName,
                };
              })
            : [];

        return {
          id: room.id,
          unitId: room.unitId,
          roomNumber: room.roomNumber,
          capacity: getRoomCapacity(normalized.type, room),
          occupied: normalized.type === "RESIDENCE" ? Math.min(roomTenants.length, 1) : beds.filter((bed) => bed.occupied).length,
          sharingType: room.sharingType,
          propertyType: normalized.type,
          beds,
        };
      }),
    })),
  };
}

export function getHostelOccupancySummary(hostel: OwnerHostel, tenants: TenantRecord[]) {
  const inventory = buildHostelInventory(hostel, tenants);
  const totalRooms = inventory.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
  const totalBeds = inventory.floors.reduce((sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.capacity, 0), 0);
  const occupiedUnits = inventory.floors.reduce(
    (sum, floor) => sum + floor.rooms.filter((room) => room.propertyType === "RESIDENCE" && room.occupied > 0).length,
    0,
  );
  const occupiedBeds = inventory.floors.reduce(
    (sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + (room.propertyType === "RESIDENCE" ? 0 : room.occupied), 0),
    0,
  );

  return {
    inventory,
    totalRooms,
    totalBeds,
    occupiedUnits,
    vacantUnits: inventory.type === "RESIDENCE" ? Math.max(totalRooms - occupiedUnits, 0) : 0,
    occupiedBeds,
    vacantBeds: inventory.type === "PG" ? Math.max(totalBeds - occupiedBeds, 0) : 0,
    occupiedCapacity: inventory.type === "RESIDENCE" ? occupiedUnits : occupiedBeds,
    vacantCapacity: inventory.type === "RESIDENCE" ? Math.max(totalRooms - occupiedUnits, 0) : Math.max(totalBeds - occupiedBeds, 0),
  };
}
