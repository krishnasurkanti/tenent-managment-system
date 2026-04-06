import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ message: "Demo reset has been removed." }, { status: 410 });
}
