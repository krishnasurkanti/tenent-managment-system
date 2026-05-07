import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_AUTO_BACKUPS = 10;
const MAX_MANUAL_BACKUPS = 20;

export type BackupMeta = {
  id: string;
  createdAt: string;
  type: "auto" | "manual";
  sizeBytes: number;
  tenantCount: number;
};

export type BackupSnapshot = {
  version: 1;
  createdAt: string;
  type: "auto" | "manual";
  tenants: unknown[];
  hostels: unknown[];
};

export function ensureBackupDir() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function readDataFile(filename: string): unknown[] {
  try {
    const file = path.join(DATA_DIR, filename);
    if (!fs.existsSync(file)) return [];
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readSnapshot(id: string): BackupSnapshot | null {
  if (!/^[\w.-]+\.json$/.test(id)) return null;
  try {
    const content = fs.readFileSync(path.join(BACKUP_DIR, id), "utf8");
    return JSON.parse(content) as BackupSnapshot;
  } catch {
    return null;
  }
}

function purgeOldBackups(type: "auto" | "manual") {
  try {
    const suffix = type === "auto" ? "-auto.json" : "-manual.json";
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(suffix)).sort();
    const max = type === "auto" ? MAX_AUTO_BACKUPS : MAX_MANUAL_BACKUPS;
    while (files.length > max) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()!));
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export function createBackup(type: "auto" | "manual"): BackupMeta | null {
  try {
    ensureBackupDir();

    const snapshot: BackupSnapshot = {
      version: 1,
      createdAt: new Date().toISOString(),
      type,
      tenants: readDataFile("tenants.json"),
      hostels: readDataFile("hostels.json"),
    };

    const timestamp = snapshot.createdAt.replace(/[:.]/g, "-");
    const id = `${timestamp}-${type}.json`;
    const content = JSON.stringify(snapshot, null, 2);

    fs.writeFileSync(path.join(BACKUP_DIR, id), content, "utf8");
    purgeOldBackups(type);

    const stats = fs.statSync(path.join(BACKUP_DIR, id));
    return {
      id,
      createdAt: snapshot.createdAt,
      type,
      sizeBytes: stats.size,
      tenantCount: snapshot.tenants.length,
    };
  } catch {
    return null;
  }
}

export function maybeAutoBackup() {
  try {
    ensureBackupDir();
    const today = new Date().toISOString().slice(0, 10);
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith("-auto.json"));
    if (!files.some((f) => f.startsWith(today.replace(/-/g, "-")))) {
      createBackup("auto");
    }
  } catch {
    // don't fail the main operation
  }
}

export function listBackups(): BackupMeta[] {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json")).sort().reverse();
    return files.map((id): BackupMeta => {
      const snapshot = readSnapshot(id);
      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(path.join(BACKUP_DIR, id)).size;
      } catch {
        // ignore
      }
      return {
        id,
        createdAt: snapshot?.createdAt ?? new Date(0).toISOString(),
        type: snapshot?.type ?? (id.includes("-auto") ? "auto" : "manual"),
        sizeBytes,
        tenantCount: snapshot?.tenants.length ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export function getBackupById(id: string): BackupSnapshot | null {
  return readSnapshot(id);
}

export function atomicWrite(filePath: string, content: string) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch {
    // Windows: rename fails if destination exists — fall back to direct write
    fs.writeFileSync(filePath, content, "utf8");
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

export type RestoreResult = { ok: true; tenantCount: number } | { ok: false; error: string };

export function restoreFromSnapshot(snapshot: BackupSnapshot): RestoreResult {
  try {
    if (snapshot.version !== 1) return { ok: false, error: "Unsupported backup version." };
    if (!Array.isArray(snapshot.tenants)) return { ok: false, error: "Invalid backup: tenants is not an array." };

    fs.mkdirSync(DATA_DIR, { recursive: true });

    atomicWrite(path.join(DATA_DIR, "tenants.json"), JSON.stringify(snapshot.tenants, null, 2));

    if (Array.isArray(snapshot.hostels) && snapshot.hostels.length > 0) {
      atomicWrite(path.join(DATA_DIR, "hostels.json"), JSON.stringify(snapshot.hostels, null, 2));
    }

    return { ok: true, tenantCount: snapshot.tenants.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Restore failed." };
  }
}
