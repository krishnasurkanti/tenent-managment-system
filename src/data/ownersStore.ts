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

function loadState(): OwnersState {
  try {
    if (!fs.existsSync(OWNERS_FILE)) return { owners: [] };
    return JSON.parse(fs.readFileSync(OWNERS_FILE, "utf8")) as OwnersState;
  } catch {
    return { owners: [] };
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

export function validateOwner(username: string, password: string) {
  const state = loadState();
  const normalized = username.trim().toLowerCase();
  const owner = state.owners.find((o) => o.username === normalized);

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
