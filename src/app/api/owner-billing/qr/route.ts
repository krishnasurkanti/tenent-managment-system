import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const upiString = searchParams.get("upi");
  if (!upiString) return NextResponse.json({ message: "upi param required." }, { status: 400 });

  // Basic UPI ID format: localpart@provider — reject anything that doesn't look like a UPI string
  const upiPattern = /^[a-zA-Z0-9.\-_+]{2,64}@[a-zA-Z]{2,32}$/;
  if (!upiPattern.test(upiString)) {
    return NextResponse.json({ message: "Invalid UPI ID format." }, { status: 400 });
  }

  const png = await QRCode.toBuffer(upiString, {
    type: "png",
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}
