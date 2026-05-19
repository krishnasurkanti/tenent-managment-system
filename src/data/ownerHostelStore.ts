import fs from "node:fs";
import path from "node:path";
import type { OwnerHostel } from "@/types/owner-hostel";
import type { HostelRoomInventory, TenantRecord } from "@/types/tenant";
import { buildHostelInventory, normalizeHostel } from "@/utils/hostel-occupancy";

const DATA_DIR = path.join(process.cwd(), ".data");
const HOSTELS_FILE = path.join(DATA_DIR, "hostels.json");

export const DEMO_OWNER_HOSTEL_ID = "owner-hostel-aurora";

function makeRooms(prefix: string, suffix: string, beds: number) {
  return [
    { id: `room-${prefix}-${suffix}01`, roomNumber: `${suffix}01`, bedCount: 3, sharingType: "3 sharing" },
    { id: `room-${prefix}-${suffix}02`, roomNumber: `${suffix}02`, bedCount: beds, sharingType: `${beds} sharing` },
  ];
}

const demoOwnerHostels: OwnerHostel[] = [
  {
    id: DEMO_OWNER_HOSTEL_ID,
    ownerId: "owner-demo-001",
    hostelName: "Aurora Residency",
    address: "Madhapur Main Road, Hyderabad",
    type: "PG",
    createdAt: "2026-04-01T10:00:00.000Z",
    rooms: [
      ...makeRooms("aurora", "1", 2),
      ...makeRooms("aurora", "2", 2),
      ...makeRooms("aurora", "3", 2),
      ...makeRooms("aurora", "4", 2),
    ],
  },
  {
    id: "owner-hostel-lotus",
    ownerId: "owner-demo-002",
    hostelName: "Lotus Elite Stay",
    address: "Kukatpally Housing Board, Hyderabad",
    type: "PG",
    createdAt: "2026-04-03T10:00:00.000Z",
    rooms: [
      ...makeRooms("lotus", "1", 2),
      ...makeRooms("lotus", "2", 2),
      ...makeRooms("lotus", "3", 2),
      ...makeRooms("lotus", "4", 2),
    ],
  },
  {
    id: "owner-hostel-skyline",
    ownerId: "owner-demo-003",
    hostelName: "Skyline Comforts",
    address: "Gachibowli Financial District, Hyderabad",
    type: "PG",
    createdAt: "2026-04-05T10:00:00.000Z",
    rooms: [
      ...makeRooms("skyline", "1", 2),
      ...makeRooms("skyline", "2", 2),
      ...makeRooms("skyline", "3", 2),
      ...makeRooms("skyline", "4", 2),
    ],
  },
];

// In-memory store — demo hostels always present; persisted real hostels loaded at startup
let ownerHostels: OwnerHostel[] = [...getDemoOwnerHostels(), ...loadPersistedHostels()];

function loadPersistedHostels(): OwnerHostel[] {
  try {
    if (!fs.existsSync(HOSTELS_FILE)) return [];
    return JSON.parse(fs.readFileSync(HOSTELS_FILE, "utf8")) as OwnerHostel[];
  } catch {
    return [];
  }
}

function persistHostels(hostels: OwnerHostel[]) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = HOSTELS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(hostels, null, 2), "utf8");
    fs.renameSync(tmp, HOSTELS_FILE);
  } catch {
    // read-only filesystem (Vercel) — in-memory only
  }
}

function cloneHostel(hostel: OwnerHostel): OwnerHostel {
  return normalizeHostel({
    ...hostel,
    rooms: (hostel.rooms ?? []).map((room) => ({
      ...room,
      beds: room.beds?.map((bed) => ({ ...bed })),
    })),
  });
}

export function getDemoOwnerHostels(): OwnerHostel[] {
  return demoOwnerHostels.map((hostel) => cloneHostel(hostel));
}

export function reloadOwnerHostels() {
  ownerHostels = [...getDemoOwnerHostels(), ...loadPersistedHostels()];
  return ownerHostels;
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

export function getHostelsByOwnerId(ownerId: string): OwnerHostel[] {
  const persisted = loadPersistedHostels();
  const all = [...demoOwnerHostels, ...persisted];
  return all.filter((h) => h.ownerId === ownerId).map(cloneHostel);
}

export function getAllPersistedHostels(): OwnerHostel[] {
  return loadPersistedHostels().map(cloneHostel);
}

export function saveOwnerHostel(hostel: Omit<OwnerHostel, "id" | "createdAt"> & { ownerId?: string }) {
  const nextHostel = normalizeHostel({
    id: `owner-hostel-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...hostel,
  });

  ownerHostels = [nextHostel, ...ownerHostels];

  if (hostel.ownerId) {
    const persisted = loadPersistedHostels();
    persisted.unshift(nextHostel);
    persistHostels(persisted);
  }

  return cloneHostel(nextHostel);
}

export function updateOwnerHostel(hostel: Omit<OwnerHostel, "id" | "createdAt"> & { ownerId?: string }, hostelId?: string) {
  const targetId = hostelId ?? ownerHostels[0]?.id;

  if (!targetId) {
    return saveOwnerHostel(hostel);
  }

  let updatedHostel: OwnerHostel | null = null;

  ownerHostels = ownerHostels.map((item) => {
    if (item.id !== targetId) return item;
    updatedHostel = { ...item, ...hostel };
    return updatedHostel;
  });

  if (updatedHostel) {
    const persisted = loadPersistedHostels();
    const persistedIndex = persisted.findIndex((h) => h.id === targetId);
    if (persistedIndex !== -1) {
      persisted[persistedIndex] = updatedHostel;
      persistHostels(persisted);
    }
  }

  return updatedHostel ? cloneHostel(updatedHostel) : saveOwnerHostel(hostel);
}

export function resetOwnerHostel() {
  ownerHostels = getDemoOwnerHostels();
  persistHostels([]);
  return getOwnerHostels();
}

export function getOwnerHostelInventory(tenants: TenantRecord[] = []): HostelRoomInventory[] {
  return ownerHostels.map((hostel) => buildHostelInventory(hostel, tenants));
}
