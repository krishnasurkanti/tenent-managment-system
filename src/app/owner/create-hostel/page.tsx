"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, ChevronRight, Home, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OwnerHostel } from "@/types/owner-hostel";

type RoomForm = {
  id: string;
  roomNumber: string;
  bedCount: string;
};

type FloorForm = {
  id: string;
  floorLabel: string;
  rooms: RoomForm[];
};

function createRoom(index: number): RoomForm {
  return {
    id: `room-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    roomNumber: "",
    bedCount: "",
  };
}

function createFloor(index: number): FloorForm {
  return {
    id: `floor-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    floorLabel: `Floor ${index}`,
    rooms: [createRoom(1)],
  };
}

function isRoomComplete(room: RoomForm) {
  return room.roomNumber.trim() && room.bedCount && Number(room.bedCount) > 0;
}

function getSharingLabel(bedCount: string) {
  const beds = Number(bedCount);
  if (!Number.isFinite(beds) || beds < 1) {
    return "Sharing updates from bed count";
  }

  if (beds === 1) {
    return "Single sharing";
  }

  return `${beds} sharing`;
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
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [bulkRoomCount, setBulkRoomCount] = useState("2");
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

        const nextFloors = data.hostel.floors.map((floor, floorIndex) => ({
          id: floor.id,
          floorLabel: floor.floorLabel || `Floor ${floorIndex + 1}`,
                rooms:
                  floor.rooms.length > 0
                    ? floor.rooms.map((room) => ({
                        id: room.id,
                        roomNumber: room.roomNumber,
                        bedCount: String(room.bedCount),
                      }))
              : [createRoom(1)],
        }));

        setHostelName(data.hostel.hostelName);
        setAddress(data.hostel.address);
        setFloors(nextFloors);
        setActiveFloorId(nextFloors[0]?.id ?? null);
        setActiveRoomId(nextFloors[0]?.rooms[0]?.id ?? null);
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

  useEffect(() => {
    if (!floors.length) {
      const fallbackFloor = createFloor(1);
      setFloors([fallbackFloor]);
      setActiveFloorId(fallbackFloor.id);
      setActiveRoomId(fallbackFloor.rooms[0].id);
      return;
    }

    const floorExists = floors.some((floor) => floor.id === activeFloorId);
    if (!activeFloorId || !floorExists) {
      setActiveFloorId(floors[0].id);
      setActiveRoomId(floors[0].rooms[0]?.id ?? null);
      return;
    }

    const currentFloor = floors.find((floor) => floor.id === activeFloorId);
    if (!currentFloor) {
      return;
    }

    const roomExists = currentFloor.rooms.some((room) => room.id === activeRoomId);
    if (!activeRoomId || !roomExists) {
      setActiveRoomId(currentFloor.rooms[0]?.id ?? null);
    }
  }, [activeFloorId, activeRoomId, floors]);

  const activeFloor = useMemo(
    () => floors.find((floor) => floor.id === activeFloorId) ?? floors[0] ?? null,
    [activeFloorId, floors],
  );
  const activeRoom = activeFloor?.rooms.find((room) => room.id === activeRoomId) ?? activeFloor?.rooms[0] ?? null;
  const completedFloors = floors.filter((floor) => floor.rooms.length > 0 && floor.rooms.every(isRoomComplete));

  const updateFloor = (floorId: string, updater: (floor: FloorForm) => FloorForm) => {
    setFloors((current) => current.map((floor) => (floor.id === floorId ? updater(floor) : floor)));
  };

  const updateRoom = (floorId: string, roomId: string, key: keyof RoomForm, value: string) => {
    updateFloor(floorId, (floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => (room.id === roomId ? { ...room, [key]: value } : room)),
    }));
  };

  const addAnotherFloor = () => {
    setError("");
    const nextFloor = createFloor(floors.length + 1);
    setFloors((current) => [...current, nextFloor]);
    setActiveFloorId(nextFloor.id);
    setActiveRoomId(nextFloor.rooms[0].id);
  };

  const removeFloor = (floorId: string) => {
    setError("");
    setFloors((current) =>
      current
        .filter((floor) => floor.id !== floorId)
        .map((floor, index) => ({
          ...floor,
          floorLabel: `Floor ${index + 1}`,
        })),
    );
  };

  const handleAddRoom = () => {
    setError("");

    if (!activeFloor || !activeRoom) {
      return;
    }

    if (!activeFloor.floorLabel.trim()) {
      setError("Please select or enter the floor name before adding a room.");
      return;
    }

    if (!isRoomComplete(activeRoom)) {
      setError("Please finish the current room details before adding the next room.");
      return;
    }

    const nextRoom = createRoom(activeFloor.rooms.length + 1);
    updateFloor(activeFloor.id, (floor) => ({
      ...floor,
      rooms: [...floor.rooms, nextRoom],
    }));
    setActiveRoomId(nextRoom.id);
  };

  const handleAddMultipleRooms = () => {
    setError("");

    if (!activeFloor || !activeRoom) {
      return;
    }

    if (!activeFloor.floorLabel.trim()) {
      setError("Please select or enter the floor name before adding rooms.");
      return;
    }

    if (!isRoomComplete(activeRoom)) {
      setError("Please finish the current room details before adding more rooms.");
      return;
    }

    const roomCount = Number(bulkRoomCount);
    if (!Number.isInteger(roomCount) || roomCount < 2) {
      setError("Please select a valid number of rooms to add.");
      return;
    }

    const nextRooms = Array.from({ length: roomCount }, (_, index) => createRoom(activeFloor.rooms.length + index + 1));
    updateFloor(activeFloor.id, (floor) => ({
      ...floor,
      rooms: [...floor.rooms, ...nextRooms],
    }));
    setActiveRoomId(nextRooms[0]?.id ?? null);
  };

  const handleFinishFloor = () => {
    setError("");

    if (!activeFloor) {
      return;
    }

    if (!activeFloor.floorLabel.trim()) {
      setError("Please select or enter the floor name before finishing this floor.");
      return;
    }

    const hasInvalidRoom =
      activeFloor.rooms.length === 0 || activeFloor.rooms.some((room) => !isRoomComplete(room));

    if (hasInvalidRoom) {
      setError("Please finish the current room details before finishing this floor.");
      return;
    }

    const nextIncompleteFloor = floors.find(
      (floor) => floor.id !== activeFloor.id && floor.rooms.some((room) => !isRoomComplete(room)),
    );

    if (nextIncompleteFloor) {
      setActiveFloorId(nextIncompleteFloor.id);
      setActiveRoomId(nextIncompleteFloor.rooms[0]?.id ?? null);
      return;
    }

    addAnotherFloor();
  };

  const handleRemoveRoom = (roomId: string) => {
    setError("");

    if (!activeFloor) {
      return;
    }

    if (activeFloor.rooms.length === 1) {
      setError("Each floor needs at least one room.");
      return;
    }

    const remainingRooms = activeFloor.rooms.filter((room) => room.id !== roomId);
    updateFloor(activeFloor.id, (floor) => ({
      ...floor,
      rooms: remainingRooms,
    }));
    setActiveRoomId(remainingRooms[Math.max(0, remainingRooms.length - 1)]?.id ?? null);
  };

  const handleSave = async () => {
    setError("");

    if (!hostelName.trim() || !address.trim()) {
      setError("Please enter hostel name and address.");
      return;
    }

    const hasInvalidFloor = floors.some((floor) => !floor.floorLabel.trim());
    if (hasInvalidFloor) {
      setError("Please select a floor for each section before saving.");
      return;
    }

    const hasInvalidRoom = floors.some(
      (floor) =>
        floor.rooms.length === 0 ||
        floor.rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || Number(room.bedCount) < 1),
    );

    if (hasInvalidRoom) {
      setError("Please complete each room with room number and bed count.");
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
          sharingType: getSharingLabel(room.bedCount),
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4eefb_0%,#efe7fb_30%,#f7f3ff_65%,#faf7ff_100%)] px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(247,241,255,0.92)_100%)] shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
          <div className="border-b border-white/70 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[linear-gradient(180deg,#efe4ff_0%,#fce4ef_100%)] p-2.5 text-violet-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Hostel Basics</h2>
                <p className="text-[11px] text-slate-500">Only the fields you actually need: hostel name and address.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-2">
            <Field label="Hostel Name">
              <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-3 shadow-[0_12px_26px_rgba(170,148,255,0.08)]">
                <Building2 className="h-4 w-4 shrink-0 text-violet-500" />
                <input
                  value={hostelName}
                  onChange={(event) => setHostelName(event.target.value)}
                  placeholder="Enter hostel name"
                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </Field>
            <Field label="Address">
              <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-3 shadow-[0_12px_26px_rgba(170,148,255,0.08)]">
                <MapPin className="h-4 w-4 shrink-0 text-pink-500" />
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter hostel address"
                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                />
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </div>
            </Field>
          </div>
        </Card>

        <Card className="overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(247,241,255,0.92)_100%)] shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
          <div className="border-b border-white/70 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[linear-gradient(180deg,#efe4ff_0%,#fce4ef_100%)] p-2.5 text-violet-600">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Floor and Room Setup</h2>
                <p className="text-[11px] text-slate-500">Add floor, room number, and bed count. Sharing is automatic from beds.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-2">
              {floors.map((floor, index) => {
                const isActive = floor.id === activeFloor?.id;
                const isComplete = floor.rooms.length > 0 && floor.rooms.every(isRoomComplete);

                return (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => {
                      setActiveFloorId(floor.id);
                      setActiveRoomId(floor.rooms[0]?.id ?? null);
                      setError("");
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold shadow-sm transition ${
                      isActive
                        ? "border-pink-200 bg-[linear-gradient(90deg,#ffe7f2_0%,#efe6ff_100%)] text-violet-700"
                        : isComplete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-white/80 bg-white/80 text-slate-600"
                    }`}
                  >
                    <span>{floor.floorLabel || `Floor ${index + 1}`}</span>
                    {isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </button>
                );
              })}
            </div>

            {activeFloor && activeRoom ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
                <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,245,251,0.96)_0%,rgba(242,237,255,0.94)_100%)] p-3 shadow-[0_16px_34px_rgba(170,148,255,0.1)] sm:p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current Floor</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-800">{activeFloor.floorLabel || "Select Floor"}</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Choose the floor first, then complete the room details below.</p>
                    </div>
                    {floors.length > 1 ? (
                      <Button
                        variant="ghost"
                        onClick={() => removeFloor(activeFloor.id)}
                          className="w-full rounded-2xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:w-auto"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Floor
                      </Button>
                    ) : null}
                  </div>

                  <Field label="Floor">
                    <input
                      value={activeFloor.floorLabel}
                      onChange={(event) =>
                        updateFloor(activeFloor.id, (floor) => ({
                          ...floor,
                          floorLabel: event.target.value,
                        }))
                      }
                      placeholder="Ex: Ground Floor or Floor 1"
                      className="w-full rounded-2xl border border-white/80 bg-white/90 px-3 py-3 text-[13px] text-slate-700 outline-none shadow-[0_10px_24px_rgba(170,148,255,0.08)] transition focus:border-pink-200"
                    />
                  </Field>

                  <div className="mt-4 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbf5ff_100%)] p-3 shadow-[0_14px_32px_rgba(170,148,255,0.08)] sm:p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Active Room</p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-800">
                          Room {activeFloor.rooms.findIndex((room) => room.id === activeRoom.id) + 1}
                        </h4>
                        <p className="text-[11px] text-slate-500">Enter room number and how many beds this room has.</p>
                      </div>
                      {activeFloor.rooms.length > 1 ? (
                        <Button
                          variant="ghost"
                          onClick={() => handleRemoveRoom(activeRoom.id)}
                          className="w-full rounded-2xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:w-auto"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Room
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Room Number">
                        <input
                          value={activeRoom.roomNumber}
                          onChange={(event) => updateRoom(activeFloor.id, activeRoom.id, "roomNumber", event.target.value)}
                          placeholder="Ex: 101"
                          className="w-full rounded-2xl border border-white/80 bg-white/90 px-3 py-3 text-[13px] text-slate-700 outline-none shadow-[0_10px_24px_rgba(170,148,255,0.08)] transition focus:border-pink-200"
                        />
                      </Field>
                      <Field label="Number of Beds">
                        <input
                          type="number"
                          min="1"
                          value={activeRoom.bedCount}
                          onChange={(event) => updateRoom(activeFloor.id, activeRoom.id, "bedCount", event.target.value)}
                          placeholder="Ex: 3"
                          className="w-full rounded-2xl border border-white/80 bg-white/90 px-3 py-3 text-[13px] text-slate-700 outline-none shadow-[0_10px_24px_rgba(170,148,255,0.08)] transition focus:border-pink-200"
                        />
                      </Field>
                      <Field label="Sharing">
                        <div className="flex min-h-[48px] items-center rounded-2xl border border-white/80 bg-white/90 px-3 py-3 text-[13px] font-medium text-violet-700 shadow-[0_10px_24px_rgba(170,148,255,0.08)]">
                          {getSharingLabel(activeRoom.bedCount)}
                        </div>
                      </Field>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <select
                          value={bulkRoomCount}
                          onChange={(event) => setBulkRoomCount(event.target.value)}
                          className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-3 text-[13px] font-medium text-slate-700 outline-none shadow-[0_10px_24px_rgba(170,148,255,0.08)]"
                        >
                          <option value="2">Add 2 rooms</option>
                          <option value="3">Add 3 rooms</option>
                          <option value="5">Add 5 rooms</option>
                        </select>
                        <Button
                          variant="secondary"
                          className="w-full rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)] text-violet-700 shadow-[0_10px_24px_rgba(170,148,255,0.08)] sm:w-auto"
                          onClick={handleAddMultipleRooms}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Multiple
                        </Button>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="w-full bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:flex-1"
                          onClick={handleAddRoom}
                        >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Room
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-full rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)] text-violet-700 shadow-[0_10px_24px_rgba(170,148,255,0.08)] sm:flex-1"
                          onClick={handleFinishFloor}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Finish Floor
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(247,241,255,0.94)_100%)] p-3 shadow-[0_16px_34px_rgba(170,148,255,0.1)] sm:p-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Room Progress</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-800">{activeFloor.floorLabel}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">Use Finish Floor when this floor is done and the next floor will be created automatically.</p>
                  </div>

                  <div className="space-y-2">
                    {activeFloor.rooms.map((room, index) => {
                      const isActive = room.id === activeRoom.id;
                      const isComplete = isRoomComplete(room);

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setActiveRoomId(room.id)}
                          className={`flex w-full items-center justify-between rounded-[22px] border px-3 py-3 text-left shadow-sm transition ${
                            isActive
                              ? "border-pink-200 bg-[linear-gradient(90deg,#ffe7f2_0%,#efe6ff_100%)]"
                              : isComplete
                                ? "border-emerald-200 bg-emerald-50/70"
                                : "border-white/80 bg-white/85"
                          }`}
                        >
                          <div>
                            <p className="text-[12px] font-semibold text-slate-800">Room {index + 1}</p>
                            <p className="text-[11px] text-slate-500">
                              {room.roomNumber.trim()
                                ? [room.roomNumber, `${room.bedCount || 0} beds`, getSharingLabel(room.bedCount)].join(" - ")
                                : "Room details pending"}
                            </p>
                          </div>
                          {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-[22px] border border-dashed border-violet-100 bg-[linear-gradient(180deg,#fff9fc_0%,#f5efff_100%)] px-3 py-3">
                    <p className="text-[11px] font-semibold text-slate-700">Completed floors</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      {completedFloors.length > 0
                        ? `${completedFloors.length} floor${completedFloors.length > 1 ? "s are" : " is"} ready. You can still tap any floor chip above to review it.`
                        : "No floor is fully completed yet."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {floors.map((floor) => (
                <div key={floor.id} className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,241,255,0.88)_100%)] px-3 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">{floor.floorLabel}</p>
                      <p className="text-[11px] text-slate-500">
                        {floor.rooms.length} room{floor.rooms.length > 1 ? "s" : ""} added
                      </p>
                    </div>
                    {floor.rooms.every(isRoomComplete) ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Complete
                      </span>
                    ) : (
                      <span className="rounded-full bg-[linear-gradient(90deg,#fff0d6_0%,#ffe3cc_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-white/70 pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                className="w-full rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)] text-slate-700 shadow-[0_10px_24px_rgba(170,148,255,0.08)] sm:w-auto"
                onClick={() => router.push("/owner/dashboard")}
              >
                Cancel
              </Button>
              <Button
                className="w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:w-auto"
                onClick={handleSave}
              >
                {saving ? "Saving..." : isEditMode ? "Update Hostel" : "Add Hostel"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

function CreateHostelLoadingState() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4eefb_0%,#efe7fb_30%,#f7f3ff_65%,#faf7ff_100%)] px-4 py-5 sm:px-8">
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
      <span className="mb-1.5 block text-[11px] font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
