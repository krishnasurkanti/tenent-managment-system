import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const OWNERS_FILE = path.join(DATA_DIR, "owners.json");

export type Owner = {
  id: string;
  name: string;
  email: string;
  username: string;
  plainPassword: string;
  passwordHash: string;
  status: "active" | "inactive";
  createdAt: string;
};

type OwnersState = { owners: Owner[] };

const DEMO_OWNERS: Owner[] = [
  {
    id: "owner-demo-001",
    name: "Ravi Kumar",
    email: "ravi@pgmanager.in",
    username: "ravi_pg",
    plainPassword: "ravi@123",
    passwordHash: "cca5c7eadec305cbad3346bfe52c7db7:af55da9919528bc49d8e30849c73227bad489917892cb7214493b42a21923c53889f02edd9756c8e692b3f6fac1bb7dd03cd3d89653eb034e7ff570ea9646d2b",
    status: "active",
    createdAt: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "owner-demo-002",
    name: "Priya Nair",
    email: "priya@pgmanager.in",
    username: "priya_homes",
    plainPassword: "priya@123",
    passwordHash: "de4c8230db0c58e2206d6c263709459a:da8fb3745451ec991a4ea6518517fdfd4978eb172b3dc5164da3c99398f8899235334772db15f5b7850d5c695f012304e2667c8723f2ff4e913f517922cc4cdd",
    status: "active",
    createdAt: "2026-02-03T11:30:00.000Z",
  },
  {
    id: "owner-demo-003",
    name: "Suresh Reddy",
    email: "suresh@pgmanager.in",
    username: "suresh_stay",
    plainPassword: "suresh@123",
    passwordHash: "8a3b23aa46bf2f92ace74b227c7c9815:82d5152e19bbc6c62673401a37fb82b30308fb89c5956e79ebb0ab2ee759692bc9d44a263f186b3c4b902137ad7e466a47b9a2f2074072e9faff516f9cc15b2a",
    status: "inactive",
    createdAt: "2026-03-15T14:00:00.000Z",
  },
];

function loadState(): OwnersState {
  try {
    if (!fs.existsSync(OWNERS_FILE)) return { owners: DEMO_OWNERS };
    const parsed = JSON.parse(fs.readFileSync(OWNERS_FILE, "utf8")) as OwnersState;
    if (!Array.isArray(parsed.owners) || parsed.owners.length === 0) return { owners: DEMO_OWNERS };
    return parsed;
  } catch {
    return { owners: DEMO_OWNERS };
  }
}

function persist(state: OwnersState) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OWNERS_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // read-only filesystem (Vercel) — in-memory only
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, storedDigest] = storedHash.split(":");
  if (!salt || !storedDigest) return false;
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(storedDigest, "hex"));
}

export function getOwners(): Owner[] {
  return loadState().owners;
}

export function getOwnerById(id: string): Owner | undefined {
  return loadState().owners.find((o) => o.id === id);
}

export function createOwner(params: {
  name: string;
  email: string;
  username: string;
  password: string;
}): Owner {
  const state = loadState();
  const username = params.username.trim().toLowerCase();
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password.trim();

  if (!name) throw new Error("Name is required.");
  if (!email || !email.includes("@")) throw new Error("Valid email is required.");
  if (!username || username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  if (state.owners.some((o) => o.username === username)) {
    throw new Error("Username already taken.");
  }
  if (state.owners.some((o) => o.email === email)) {
    throw new Error("Email already registered.");
  }

  const owner: Owner = {
    id: `owner-${crypto.randomBytes(8).toString("hex")}`,
    name,
    email,
    username,
    plainPassword: password,
    passwordHash: hashPassword(password),
    status: "active",
    createdAt: new Date().toISOString(),
  };

  state.owners.push(owner);
  persist(state);
  return owner;
}

export function updateOwnerStatus(id: string, status: "active" | "inactive") {
  const state = loadState();
  state.owners = state.owners.map((o) =>
    o.id === id ? { ...o, status } : o
  );
  persist(state);
}

export function validateOwner(identifier: string, password: string) {
  const state = loadState();
  const normalized = identifier.trim().toLowerCase();
  const owner = state.owners.find((o) => o.username === normalized || o.email === normalized);

  if (!owner) return { ok: false as const, reason: "invalid" as const };
  if (owner.status === "inactive") return { ok: false as const, reason: "suspended" as const };
  if (!verifyPassword(password, owner.passwordHash)) return { ok: false as const, reason: "invalid" as const };

  return { ok: true as const, owner };
}

export function deleteOwner(id: string) {
  const state = loadState();
  state.owners = state.owners.filter((o) => o.id !== id);
  persist(state);
}
