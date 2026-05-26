import { atomicWrite, maybeAutoBackup } from "@/lib/backup";
import type { FinanceLedgerEntry } from "@/types/finance-ledger";
import fs from "node:fs";
import path from "node:path";

const LEDGER_DATA_DIR = path.join(process.cwd(), ".data");
const LEDGER_DATA_FILE = path.join(LEDGER_DATA_DIR, "finance-ledger.json");

let liveLedgerEntries: FinanceLedgerEntry[] = loadLedgerEntries();
let demoLedgerEntries: FinanceLedgerEntry[] = [];

function loadLedgerEntries() {
  try {
    if (!fs.existsSync(LEDGER_DATA_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(LEDGER_DATA_FILE, "utf8")) as FinanceLedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLedgerEntries(records: FinanceLedgerEntry[]) {
  try {
    fs.mkdirSync(LEDGER_DATA_DIR, { recursive: true });
    maybeAutoBackup();
    atomicWrite(LEDGER_DATA_FILE, JSON.stringify(records, null, 2));
  } catch {
    // read-only filesystem - keep in memory for the current session
  }
}

export function getFinanceLedgerEntries(isDemo = false) {
  return isDemo ? demoLedgerEntries : liveLedgerEntries;
}

export function resetFinanceLedgerEntries(isDemo = false) {
  if (isDemo) {
    demoLedgerEntries = [];
    return demoLedgerEntries;
  }

  liveLedgerEntries = [];
  persistLedgerEntries(liveLedgerEntries);
  return liveLedgerEntries;
}

export function addFinanceLedgerEntry(
  input: Omit<FinanceLedgerEntry, "id" | "createdAt">,
  isDemo = false,
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Ledger amount must be greater than zero.");
  }

  const records = isDemo ? demoLedgerEntries : liveLedgerEntries;
  const entry: FinanceLedgerEntry = {
    id: `ledger-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
    amount: Number(input.amount),
  };

  records.unshift(entry);
  if (!isDemo) persistLedgerEntries(liveLedgerEntries);
  return entry;
}
