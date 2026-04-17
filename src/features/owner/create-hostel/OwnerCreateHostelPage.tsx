"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, ChevronRight, Home, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchOwnerHostel, saveOwnerHostel } from "@/services/owner/owner-hostels.service";

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
    return "";
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
  // Scoped to Hostel/PG only — Residence disabled
  const [hostelType] = useState<"PG" | "RESIDENCE">("PG");
  const [floors, setFloors] = useState<FloorForm[]>([createFloor(1)]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

        const { data } = await fetchOwnerHostel(storedHostelId);

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
  const activeFloorCompleted = Boolean(activeFloor && activeFloor.rooms.length > 0 && activeFloor.rooms.every(isRoomComplete));
  const roomLabel = hostelType === "RESIDENCE" ? "Unit" : "Room";

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
    if (saving) {
      return;
    }

    setError("");
    const nextFloor = createFloor(floors.length + 1);
    setFloors((current) => [...current, nextFloor]);
    setActiveFloorId(nextFloor.id);
    setActiveRoomId(nextFloor.rooms[0].id);
  };

  const removeFloor = (floorId: string) => {
    if (saving) {
      return;
    }

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
    if (saving) {
      return;
    }

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

  const handleFinishFloor = () => {
    if (saving) {
      return;
    }

    setError("");

    if (!activeFloor) {
      return;
    }

    if (!activeFloor.floorLabel.trim()) {
      setError("Please select or enter the floor name before finishing this floor.");
      return;
    }

    const trimmedRooms = activeFloor.rooms.filter((room, index, rooms) => {
      const isTrailingRoom = index === rooms.length - 1;
      const isEmpty = !room.roomNumber.trim() && !room.bedCount.trim();
      return !(isTrailingRoom && isEmpty);
    });

    const hasInvalidRoom =
      trimmedRooms.length === 0 || trimmedRooms.some((room) => !isRoomComplete(room));

    if (hasInvalidRoom) {
      setError("Please save every room on this floor before finishing the floor.");
      return;
    }

    if (trimmedRooms.length !== activeFloor.rooms.length) {
      updateFloor(activeFloor.id, (floor) => ({
        ...floor,
        rooms: trimmedRooms,
      }));
      setActiveRoomId(trimmedRooms[trimmedRooms.length - 1]?.id ?? null);
    }
  };

  const handleRemoveRoom = (roomId: string) => {
    if (saving) {
      return;
    }

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

    if (saving) {
      return;
    }

    if (!hostelName.trim() || !address.trim()) {
      const missingFields = [
        !hostelName.trim() ? "hostel name" : null,
        !address.trim() ? "address" : null,
      ].filter(Boolean);
      setError(`Cannot save hostel yet. Missing: ${missingFields.join(", ")}.`);
      return;
    }

    const hasInvalidFloor = floors.some((floor) => !floor.floorLabel.trim());
    if (hasInvalidFloor) {
      setError("Cannot save hostel yet. Each floor needs a floor name.");
      return;
    }

    const hasInvalidRoom = floors.some(
      (floor) =>
        floor.rooms.length === 0 ||
        floor.rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || Number(room.bedCount) < 1),
    );

    if (hasInvalidRoom) {
      setError("Cannot save hostel yet. Each room needs both a room number and a bed count greater than 0.");
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
          bedCount: hostelType === "RESIDENCE" ? 1 : Number(room.bedCount),
          sharingType: hostelType === "RESIDENCE" ? "Private unit" : getSharingLabel(room.bedCount),
        })),
      })),
    };

    const { response, data } = await saveOwnerHostel({
      hostelId: editingHostelId,
      isEditMode,
      hostelName: payload.hostelName,
      address: payload.address,
      type: hostelType,
      floors: payload.floors,
    });

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

  const handleNextFromBasics = () => {
    setError("");

    if (!hostelName.trim() || !address.trim()) {
      const missingFields = [
        !hostelName.trim() ? "hostel name" : null,
        !address.trim() ? "address" : null,
      ].filter(Boolean);
      setError(`Complete ${missingFields.join(" and ")} before continuing.`);
      return;
    }

    setStep(2);
  };

  const handleNextFromSetup = () => {
    setError("");

    const hasInvalidFloor = floors.some((floor) => !floor.floorLabel.trim());
    if (hasInvalidFloor) {
      setError("Finish naming each floor before review.");
      return;
    }

    const hasInvalidRoom = floors.some(
      (floor) =>
        floor.rooms.length === 0 ||
        floor.rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || Number(room.bedCount) < 1),
    );

    if (hasInvalidRoom) {
      setError("Finish every room first. Each room needs a room number and bed count before review.");
      return;
    }

    setStep(3);
  };

  if (loadingExisting) {
    return <CreateHostelLoadingState />;
  }

  return (
    <div className="bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)] rounded-[22px] px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
        {error ? (
          <div className="rounded-xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <WizardPill label="1. Basics" active={step === 1} done={step > 1} />
          <WizardPill label="2. Setup" active={step === 2} done={step > 2} />
          <WizardPill label="3. Review" active={step === 3} done={false} />
        </div>

        {step === 1 ? (
        <Card className="overflow-hidden border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <div className="border-b border-white/70 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2.5 text-[var(--accent)]">
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
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <Building2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <input
                  value={hostelName}
                  onChange={(event) => setHostelName(event.target.value)}
                  disabled={saving}
                  placeholder="Enter hostel name"
                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </Field>
            <Field label="Address">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  disabled={saving}
                  placeholder="Enter hostel address"
                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                />
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </div>
            </Field>
          </div>

          <div className="px-4 pb-4 sm:px-5">
            <Field label="Property Type">
              <div className="flex gap-2 pt-0.5">
                <div className="flex-1 rounded-2xl border border-blue-400 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-[var(--accent)] shadow-sm">
                  <p>Hostel / PG</p>
                  <p className="mt-0.5 text-[11px] font-normal text-slate-500">Bed-based sharing rooms</p>
                </div>
              </div>
            </Field>
          </div>
          <div className="flex flex-col gap-2 border-t border-white/70 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <Button
              variant="secondary"
              className="w-full border-slate-200 bg-white text-slate-800 shadow-sm hover:text-slate-900 sm:w-auto"
              disabled={saving}
              onClick={() => router.push("/owner/dashboard")}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-blue-600 text-white shadow-[var(--shadow-soft)] hover:text-white sm:w-auto"
              disabled={saving}
              onClick={handleNextFromBasics}
            >
              Continue
            </Button>
          </div>
        </Card>
        ) : null}

        {step === 2 ? (
        <Card className="overflow-hidden border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <div className="border-b border-white/70 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2.5 text-[var(--accent)]">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Floor and Room Setup</h2>
                <p className="text-[11px] text-slate-500">
                  {hostelType === "RESIDENCE"
                    ? "Add floors and units. Residence units are treated as single-allocation spaces."
                    : "Add floor, room number, and bed count. Sharing is automatic from beds."}
                </p>
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
                      if (saving) return;
                      setActiveFloorId(floor.id);
                      setActiveRoomId(floor.rooms[0]?.id ?? null);
                      setError("");
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold shadow-sm transition ${
                      isActive
                        ? "border-blue-200 bg-blue-50 text-[var(--accent)]"
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
                <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-3 shadow-sm sm:p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current Floor</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-800">{activeFloor.floorLabel || "Select Floor"}</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Choose the floor first, then complete the room details below.</p>
                    </div>
                    {floors.length > 1 ? (
                      <Button
                        variant="ghost"
                        disabled={saving}
                        onClick={() => removeFloor(activeFloor.id)}
                          className="w-full rounded-2xl text-[color:var(--error)] hover:bg-[color:var(--error-soft)] hover:text-[#991b1b] sm:w-auto"
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
                      disabled={saving}
                      placeholder="Ex: Ground Floor or Floor 1"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-700 outline-none shadow-sm transition focus:border-blue-300"
                    />
                  </Field>

                  <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Active Room</p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-800">
                          {roomLabel} {activeFloor.rooms.findIndex((room) => room.id === activeRoom.id) + 1}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {hostelType === "RESIDENCE" ? "Enter the unit number for this residence." : "Enter room number and how many beds this room has."}
                        </p>
                      </div>
                      {activeFloor.rooms.length > 1 ? (
                        <Button
                          variant="ghost"
                          disabled={saving}
                          onClick={() => handleRemoveRoom(activeRoom.id)}
                          className="w-full rounded-2xl text-[color:var(--error)] hover:bg-[color:var(--error-soft)] hover:text-[#991b1b] sm:w-auto"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Room
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={`${roomLabel} Number`}>
                        <input
                          value={activeRoom.roomNumber}
                          onChange={(event) => updateRoom(activeFloor.id, activeRoom.id, "roomNumber", event.target.value)}
                          disabled={saving}
                          placeholder={hostelType === "RESIDENCE" ? "Ex: A-101" : "Ex: 101"}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-700 outline-none shadow-sm transition focus:border-blue-300"
                        />
                      </Field>
                      <Field label={hostelType === "RESIDENCE" ? "Occupancy" : "Number of Beds"}>
                        <input
                          type="number"
                          min="1"
                          value={hostelType === "RESIDENCE" ? "1" : activeRoom.bedCount}
                          onChange={(event) => updateRoom(activeFloor.id, activeRoom.id, "bedCount", event.target.value)}
                          disabled={saving}
                          placeholder={hostelType === "RESIDENCE" ? "1" : "Ex: 3"}
                          readOnly={hostelType === "RESIDENCE"}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-700 outline-none shadow-sm transition focus:border-blue-300"
                        />
                      </Field>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="w-full bg-blue-600 text-white shadow-[var(--shadow-soft)] hover:text-white sm:flex-1"
                          disabled={saving}
                          onClick={handleAddRoom}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                        {`Save and Add New ${roomLabel}`}
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-full rounded-2xl border-slate-200 bg-white text-[var(--accent)] shadow-sm sm:flex-1"
                          disabled={saving}
                          onClick={handleFinishFloor}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Finish Floor
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Room Progress</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-800">{activeFloor.floorLabel}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Use Save and Add New Room to save the current room and open the next one. When all rooms on this floor are complete, press Finish Floor.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {activeFloor.rooms.map((room, index) => {
                      const isActive = room.id === activeRoom.id;
                      const isComplete = isRoomComplete(room);

                      return (
                        <button
                          key={room.id}
                          type="button"
                          disabled={saving}
                          onClick={() => setActiveRoomId(room.id)}
                          className={`flex w-full items-center justify-between rounded-[22px] border px-3 py-3 text-left shadow-sm transition ${
                            isActive
                              ? "border-blue-200 bg-blue-50"
                              : isComplete
                                ? "border-emerald-200 bg-emerald-50/70"
                                : "border-white/80 bg-white/85"
                          }`}
                        >
                          <div>
                              <p className="text-[12px] font-semibold text-slate-800">{roomLabel} {index + 1}</p>
                              <p className="text-[11px] text-slate-500">
                                {room.roomNumber.trim()
                                ? hostelType === "RESIDENCE"
                                  ? [room.roomNumber, "Private unit"].join(" - ")
                                  : [room.roomNumber, `${room.bedCount || 0} beds`, getSharingLabel(room.bedCount)].join(" - ")
                                : `${roomLabel} details pending`}
                              </p>
                            </div>
                          {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-[22px] border border-dashed border-blue-100 bg-blue-50 px-3 py-3">
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
                <div key={floor.id} className="rounded-[22px] border border-slate-100 bg-white px-3 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">{floor.floorLabel}</p>
                      <p className="text-[11px] text-slate-500">
                        {floor.rooms.length} {roomLabel.toLowerCase()}{floor.rooms.length > 1 ? "s" : ""} added
                      </p>
                    </div>
                    {floor.rooms.every(isRoomComplete) ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Complete
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]">
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
                className="w-full rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm sm:w-auto"
                disabled={saving}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                variant="secondary"
                className="w-full rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm sm:w-auto"
                disabled={saving}
                onClick={() => router.push("/owner/dashboard")}
              >
                Cancel
              </Button>
              {activeFloorCompleted ? (
                <>
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl border-slate-200 bg-white text-slate-800 shadow-sm hover:text-slate-900 sm:w-auto"
                    disabled={saving}
                    onClick={addAnotherFloor}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Another Floor
                  </Button>
                  <Button
                    className="w-full rounded-2xl bg-blue-600 text-white shadow-[var(--shadow-soft)] hover:text-white sm:w-auto"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? "Saving..." : isEditMode ? "Update Hostel" : "Save Hostel"}
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full rounded-2xl bg-blue-600 text-white shadow-[var(--shadow-soft)] hover:text-white sm:w-auto"
                  disabled={saving}
                  onClick={handleNextFromSetup}
                >
                  Review Hostel
                </Button>
              )}
            </div>
          </div>
        </Card>
        ) : null}

        {step === 3 ? (
          <Card className="overflow-hidden border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <div className="border-b border-white/70 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-indigo-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Review Hostel</h2>
                  <p className="text-[11px] text-slate-500">Check the summary once, then save the hostel.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="grid gap-3 md:grid-cols-2">
                <ReviewCard label="Hostel Name" value={hostelName} />
                <ReviewCard label="Address" value={address} />
              </div>

              <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Structure</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-800">
                      {floors.length} floor{floors.length > 1 ? "s" : ""} • {floors.reduce((sum, floor) => sum + floor.rooms.length, 0)} {roomLabel.toLowerCase()}{floors.reduce((sum, floor) => sum + floor.rooms.length, 0) > 1 ? "s" : ""}
                    </h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">
                    Ready to save
                  </span>
                </div>

                <div className="space-y-2">
                  {floors.map((floor) => (
                    <div key={floor.id} className="rounded-2xl border border-white/80 bg-white/90 px-3 py-3">
                      <p className="text-[12px] font-semibold text-slate-800">{floor.floorLabel}</p>
                      <div className="mt-2 space-y-1.5">
                        {floor.rooms.map((room) => (
                          <div key={room.id} className="flex items-center justify-between gap-3 text-[11px] text-slate-600">
                            <span>{room.roomNumber}</span>
                            <span>{hostelType === "RESIDENCE" ? "1 occupant" : `${room.bedCount} beds`}</span>
                            <span className="font-medium text-indigo-700">{hostelType === "RESIDENCE" ? "Private unit" : getSharingLabel(room.bedCount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/70 pt-4 sm:flex-row sm:justify-end">
                <Button variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => setStep(2)}>
                  Back to Setup
                </Button>
                <Button className="w-full sm:w-auto" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : isEditMode ? "Update Hostel" : "Add Hostel"}
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function CreateHostelLoadingState() {
  return (
    <div className="bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)] rounded-[22px] px-4 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
          Loading hostel details...
        </Card>
      </div>
    </div>
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

function WizardPill({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-2 text-[11px] font-semibold shadow-sm ${
        active
          ? "border border-blue-500 bg-blue-600 text-white shadow-[var(--shadow-soft)]"
          : done
            ? "border border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700"
            : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </div>
  );
}

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}
