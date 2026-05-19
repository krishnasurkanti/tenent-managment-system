import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), ".data");

export default function globalSetup() {
  // Reset persisted data files so the server starts from demo state.
  // When the server is freshly started (CI), this is sufficient.
  // When reuseExistingServer is true (local dev), the reset API endpoint
  // at /api/test/reset will be called from the auth.setup.ts project
  // after the server is confirmed to be running.
  for (const file of ["hostels.json", "tenants.json"]) {
    fs.writeFileSync(path.join(DATA_DIR, file), "[]", "utf-8");
  }
}
