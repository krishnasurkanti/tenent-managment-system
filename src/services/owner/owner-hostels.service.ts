import { csrfFetch } from "@/lib/csrf-client";
import type { OwnerHostel, OwnerRoom } from "@/types/owner-hostel";

type OwnerHostelsResponse = { hostels?: OwnerHostel[] };
type OwnerHostelResponse = { hostel?: OwnerHostel | null };

export async function fetchOwnerHostels({ withInventory = false }: { withInventory?: boolean } = {}) {
  const url = withInventory ? "/api/owner-hostels?withInventory=true" : "/api/owner-hostels";
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as OwnerHostelsResponse;
  return { response, data };
}

export async function fetchOwnerHostel(hostelId?: string | null) {
  const response = await fetch(
    hostelId ? `/api/owner-hostels/${hostelId}` : "/api/owner-hostel",
    { cache: "no-store" },
  );
  const data = (await response.json()) as OwnerHostelResponse;
  return { response, data };
}

export async function saveOwnerHostel(params: {
  hostelId?: string | null;
  isEditMode?: boolean;
  hostelName: string;
  address: string;
  type?: "PG" | "RESIDENCE";
  rooms: OwnerRoom[];
}) {
  const { hostelId, isEditMode, ...payload } = params;
  const response = await csrfFetch(
    isEditMode && hostelId ? `/api/owner-hostels/${hostelId}` : "/api/owner-hostels",
    {
      method: isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = (await response.json()) as { hostel?: OwnerHostel; message?: string };
  return { response, data };
}
