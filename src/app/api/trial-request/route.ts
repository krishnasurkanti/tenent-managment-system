import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const entry = {
    ...body,
    receivedAt: new Date().toISOString(),
  };

  // Log so it's visible in Vercel function logs regardless of storage
  console.log("[TRIAL REQUEST]", JSON.stringify(entry));

  // Persist to .data/trial-requests.json when filesystem is writable (dev / self-hosted)
  try {
    const filePath = path.join(process.cwd(), ".data", "trial-requests.json");
    let existing: typeof entry[] = [];
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, "utf-8")) as typeof entry[];
    }
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...existing, entry], null, 2));
    fs.renameSync(tmp, filePath);
  } catch {
    // Vercel serverless: filesystem is read-only — request is already logged above
  }

  return NextResponse.json({ ok: true });
}
