import { redirect } from "next/navigation";
import { getOwnerHostel } from "@/data/ownerHostelStore";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export default async function OwnerEditHostelPage() {
  const session = await getOwnerSession();
  let hostel = null;

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels");
    const payload = (await backendResponse.json()) as { hostels?: unknown[] };
    hostel = Array.isArray(payload.hostels) ? payload.hostels[0] ?? null : null;
  } else {
    hostel = getOwnerHostel();
  }

  if (!hostel) {
    redirect("/owner/create-hostel");
  }

  redirect("/owner/create-hostel?mode=edit");
}
