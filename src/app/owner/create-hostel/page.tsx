"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Home, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OwnerHostel } from "@/types/owner-hostel";

type RoomForm = {
  id: string;
  roomNumber: string;
  bedCount: string;
  sharingType: string;
};

type FloorForm = {
  id: string;
  floorLabel: string;
  rooms: RoomForm[];
};

const sharingOptions = ["Single", "Double Sharing", "Triple Sharing", "Four Sharing", "Custom"];

function createRoom(index: number): RoomForm {
  return {
    id: `room-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    roomNumber: "",
    bedCount: "",
    sharingType: "Single",
  };
}

function createFloor(index: number): FloorForm {
  return {
    id: `floor-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    floorLabel: `Floor ${index}`,
    rooms: [createRoom(index)],
  };
}

export default function CreateHostelPage() {
  return (
    <Suspense fallback={<CreateHostelLoadingState />}>
      <CreateHostelPageContent />
    </Suspense>
  );
}

function CreateHostelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const [editingHostelId, setEditingHostelId] = useState<string | null>(null);
  const [hostelName, setHostelName] = useState("");
  const [address, setAddress] = useState("");
  const [floors, setFloors] = useState<FloorForm[]>([createFloor(1)]);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let active = true;

    const loadExistingHostel = async () => {
      try {
        const storedHostelId = window.localStorage.getItem("currentHostelId");
        setEditingHostelId(storedHostelId);

        const response = await fetch(
          storedHostelId ? `/api/owner-hostels/${storedHostelId}` : "/api/owner-hostel",
          { cache: "no-store" },
        );
        const data = (await response.json()) as { hostel?: OwnerHostel | null };

        if (!active) {
          return;
        }

        if (!data.hostel) {
          router.replace("/owner/create-hostel");
          return;
        }

        setHostelName(data.hostel.hostelName);
        setAddress(data.hostel.address);
        setFloors(
          data.hostel.floors.map((floor) => ({
            id: floor.id,
            floorLabel: floor.floorLabel,
            rooms: floor.rooms.map((room) => ({
              id: room.id,
              roomNumber: room.roomNumber,
              bedCount: String(room.bedCount),
              sharingType: room.sharingType,
            })),
          })),
        );
      } finally {
        if (active) {
          setLoadingExisting(false);
        }
      }
    };

    loadExistingHostel();

    return () => {
      active = false;
    };
  }, [isEditMode, router]);

  const addFloor = () => {
    setFloors((current) => [...current, createFloor(current.length + 1)]);
  };

  const removeFloor = (floorId: string) => {
    setFloors((current) =>
      current
        .filter((floor) => floor.id !== floorId)
        .map((floor, index) => ({
          ...floor,
          floorLabel: `Floor ${index + 1}`,
        })),
    );
  };

  const addRoom = (floorId: string) => {
    setFloors((current) =>
      current.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              rooms: [...floor.rooms, createRoom(floor.rooms.length + 1)],
            }
          : floor,
      ),
    );
  };

  const removeRoom = (floorId: string, roomId: string) => {
    setFloors((current) =>
      current.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              rooms: floor.rooms.filter((room) => room.id !== roomId),
            }
          : floor,
      ),
    );
  };

  const updateRoom = (floorId: string, roomId: string, key: keyof RoomForm, value: string) => {
    setFloors((current) =>
      current.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              rooms: floor.rooms.map((room) => (room.id === roomId ? { ...room, [key]: value } : room)),
            }
          : floor,
      ),
    );
  };

  const handleSave = async () => {
    setError("");

    if (!hostelName.trim() || !address.trim()) {
      setError("Please enter hostel name and address.");
      return;
    }

    const hasInvalidRoom = floors.some(
      (floor) =>
        floor.rooms.length === 0 ||
        floor.rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || Number(room.bedCount) < 1),
    );

    if (hasInvalidRoom) {
      setError("Please complete each room with room number, bed count, and sharing type.");
      return;
    }

    setSaving(true);

    const payload = {
      hostelId: editingHostelId,
      hostelName,
      address,
      floors: floors.map((floor) => ({
        id: floor.id,
        floorLabel: floor.floorLabel,
        rooms: floor.rooms.map((room) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          bedCount: Number(room.bedCount),
          sharingType: room.sharingType,
        })),
      })),
    };

    const response = await fetch(isEditMode && editingHostelId ? `/api/owner-hostels/${editingHostelId}` : "/api/owner-hostels", {
      method: isEditMode ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Unable to save hostel.");
      setSaving(false);
      return;
    }

    if (typeof window !== "undefined" && data.hostel?.id) {
      window.localStorage.setItem("currentHostelId", data.hostel.id);
    }

    router.push("/owner/dashboard");
    router.refresh();
  };

  if (loadingExisting) {
    return <CreateHostelLoadingState />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff4fb_0%,#f8fafc_38%,#ffffff_100%)] px-4 py-5 sm:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-3">
        <div className="flex flex-col gap-2.5 rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_28px_rgba(148,163,184,0.12)] md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{isEditMode ? "Edit Hostel" : "Owner Setup"}</p>
            <h1 className="mt-0.5 text-[1.1rem] font-semibold tracking-tight text-slate-800 sm:text-[1.35rem]">
              {isEditMode ? "Edit Your Hostel" : "Create Your Hostel"}
            </h1>
            <p className="mt-0.5 max-w-3xl text-[10px] text-slate-500 sm:text-[11px]">
              {isEditMode
                ? "Update hostel details, add more floors and rooms, change bed counts, and adjust sharing types."
                : "Enter hostel details, then add floors one by one. Inside each floor, define each room with room number, total beds, and sharing type."}
            </p>
          </div>
          <Button className="bg-orange-500 hover:opacity-95" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : isEditMode ? "Update Hostel" : "Save Hostel"}
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 md:px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-800">Hostel Basics</h2>
                <p className="text-[10px] text-slate-500">Start with the hostel name and address before creating the floor structure.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-3 md:grid-cols-2 md:px-5">
            <Field label="Hostel Name">
              <input
                value={hostelName}
                onChange={(event) => setHostelName(event.target.value)}
                placeholder="Enter hostel name"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-orange-300"
              />
            </Field>
            <Field label="Address">
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Enter full hostel address"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-orange-300"
              />
            </Field>
          </div>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">Floors and Rooms</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">Add floors one by one, then define the rooms inside each floor.</p>
            </div>
            <Button className="bg-orange-500 hover:opacity-95" onClick={addFloor}>
              <Plus className="mr-2 h-4 w-4" />
              Add Floor
            </Button>
          </div>

          {floors.map((floor) => (
            <Card key={floor.id} className="overflow-hidden border-slate-200 bg-white">
              <div className="flex flex-col gap-2.5 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-500">
                    <Home className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-800">{floor.floorLabel}</h3>
                    <p className="text-[10px] text-slate-500">Add rooms for this floor and define the bed capacity with sharing details.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => addRoom(floor.id)} className="border-slate-200 bg-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Room
                  </Button>
                  {floors.length > 1 ? (
                    <Button variant="ghost" onClick={() => removeFloor(floor.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Floor
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2.5 px-4 py-3 md:px-5">
                {floor.rooms.map((room, roomIndex) => (
                  <div key={room.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">Room {roomIndex + 1}</p>
                        <p className="text-[10px] text-slate-500">Enter room number, beds, and sharing type.</p>
                      </div>
                      {floor.rooms.length > 1 ? (
                        <Button variant="ghost" onClick={() => removeRoom(floor.id, room.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-2.5 md:grid-cols-3">
                      <Field label="Room Number">
                        <input
                          value={room.roomNumber}
                          onChange={(event) => updateRoom(floor.id, room.id, "roomNumber", event.target.value)}
                          placeholder="Ex: 101"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-orange-300"
                        />
                      </Field>
                      <Field label="Number of Beds">
                        <input
                          type="number"
                          min="1"
                          value={room.bedCount}
                          onChange={(event) => updateRoom(floor.id, room.id, "bedCount", event.target.value)}
                          placeholder="Ex: 3"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-orange-300"
                        />
                      </Field>
                      <Field label="Sharing Type">
                        <select
                          value={room.sharingType}
                          onChange={(event) => updateRoom(floor.id, room.id, "sharingType", event.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-orange-300"
                        >
                          {sharingOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

function CreateHostelLoadingState() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff4fb_0%,#f8fafc_38%,#ffffff_100%)] px-4 py-5 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
          Loading hostel details...
        </Card>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
