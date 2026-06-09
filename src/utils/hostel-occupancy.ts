import type { OwnerBed, OwnerHostel, OwnerRoom } from "@/types/owner-hostel";
import type { HostelBed, HostelRoomInventory, TenantRecord } from "@/types/tenant";

function slugifyRoomLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildUnitId(hostelId: string, parentId: string, room: Pick<OwnerRoom, "id" | "roomNumber">) {
  return room.id || `${hostelId}-${parentId}-${slugifyRoomLabel(room.roomNumber) || "unit"}`;
}

function buildBedId(unitId: string, index: number) {
  return `${unitId}-bed-${index + 1}`;
}

export function getSharingLabel(bedCount: string | number): string {
  const n = Number(bedCount);
  if (!Number.isFinite(n) || n < 1) return "";
  return n === 1 ? "Single sharing" : `${n} sharing`;
}

export function getRoomCapacity(type: OwnerHostel["type"], room: Pick<OwnerRoom, "bedCount">) {
  return type === "RESIDENCE" ? 1 : Math.max(room.bedCount, 1);
}

export function normalizeRoom(hostelId: string, parentId: string, type: OwnerHostel["type"], room: OwnerRoom): OwnerRoom {
  const unitId = room.unitId || buildUnitId(hostelId, parentId, room);
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

export function normalizeHostel(hostel: OwnerHostel): OwnerHostel {
  const type = hostel.type ?? "PG";
  // Support both direct `rooms` (new) and legacy floor-wrapped `floors[0].rooms` (old backend)
  const rawHostel = hostel as OwnerHostel & { floors?: Array<{ rooms?: OwnerRoom[] }> };
  const rawRooms: OwnerRoom[] =
    (hostel.rooms?.length ?? 0) > 0
      ? hostel.rooms
      : (rawHostel.floors?.[0]?.rooms ?? []);
  return {
    ...hostel,
    type,
    rooms: rawRooms.map((room) => normalizeRoom(hostel.id, "main", type, room)),
  };
}

export function buildHostelInventory(hostel: OwnerHostel, tenants: TenantRecord[] = []): HostelRoomInventory {
  const normalized = normalizeHostel(hostel);

  return {
    hostelId: normalized.id,
    hostelName: normalized.hostelName,
    type: normalized.type,
    rooms: normalized.rooms.map((room) => {
      const roomTenants = tenants.filter((tenant) => {
        if (tenant.assignment?.hostelId !== normalized.id) return false;
        const a = tenant.assignment;
        // match by unitId when both sides have it; fall back to roomNumber
        if (a.unitId && room.unitId) return a.unitId === room.unitId;
        return a.roomNumber === room.roomNumber;
      });

      // Tenants matched by explicit bedId; remainder fill positionally (legacy assignments have no bedId)
      const byBedId = new Map(
        roomTenants.filter((t) => t.assignment?.bedId).map((t) => [t.assignment!.bedId!, t]),
      );
      const noBedTenants = roomTenants.filter((t) => !t.assignment?.bedId);
      let noBedIdx = 0;

      const beds: HostelBed[] =
        normalized.type === "PG"
          ? (room.beds ?? []).map((bed) => {
              const assignedTenant =
                byBedId.get(bed.id) ??
                (noBedIdx < noBedTenants.length ? noBedTenants[noBedIdx++] : undefined);
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
  };
}

export function getHostelOccupancySummary(hostel: OwnerHostel, tenants: TenantRecord[]) {
  const inventory = buildHostelInventory(hostel, tenants);
  const totalRooms = inventory.rooms.length;
  const totalBeds = inventory.rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupiedUnits = inventory.rooms.filter((room) => room.propertyType === "RESIDENCE" && room.occupied > 0).length;
  const occupiedBeds = inventory.rooms.reduce(
    (sum, room) => sum + (room.propertyType === "RESIDENCE" ? 0 : room.occupied),
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
