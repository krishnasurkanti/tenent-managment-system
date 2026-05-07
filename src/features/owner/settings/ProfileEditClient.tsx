"use client";

import { useEffect, useState } from "react";
import { KeyRound, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { csrfFetch } from "@/lib/csrf-client";
import { ownerInputClass, ownerPanelClass } from "@/components/ui/owner-theme";

type OwnerProfile = {
  name: string;
  email: string;
  phone?: string;
};

export function ProfileEditClient({ isDemo }: { isDemo: boolean }) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    void fetch("/api/owner/profile")
      .then((r) => r.json())
      .then((data: { owner?: OwnerProfile }) => {
        if (data.owner) {
          setProfile(data.owner);
          setName(data.owner.name ?? "");
          setPhone(data.owner.phone ?? "");
        }
      });
  }, []);

  const handleSaveProfile = async () => {
    setMessage("");
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);

    const res = await csrfFetch("/api/owner/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
    });
    const data = (await res.json()) as { owner?: OwnerProfile; message?: string };

    setSaving(false);
    if (!res.ok) {
      setError(data.message ?? "Unable to save.");
      return;
    }
    if (data.owner) setProfile(data.owner);
    setMessage("Profile updated.");
  };

  const handleChangePassword = async () => {
    setPwMessage("");
    setPwError("");

    if (!currentPassword || !newPassword) {
      setPwError("Both fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    setPwSaving(true);
    const res = await csrfFetch("/api/auth/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = (await res.json()) as { message?: string };

    setPwSaving(false);
    if (!res.ok) {
      setPwError(data.message ?? "Unable to change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPwMessage("Password changed.");
  };

  return (
    <div className="space-y-3">
      <Card className={`p-4 ${ownerPanelClass}`}>
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
            <UserCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
              Account
            </p>
            <p className="text-sm font-semibold text-white">Owner Profile</p>
          </div>
        </div>

        {profile ? (
          <p className="mb-3 text-[11px] text-[color:var(--fg-secondary)]">{profile.email}</p>
        ) : null}

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-[color:var(--fg-secondary)]">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="Your name"
              className={`w-full ${ownerInputClass}`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-[color:var(--fg-secondary)]">
              Phone
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              placeholder="Phone number (optional)"
              className={`w-full ${ownerInputClass}`}
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-xs text-[color:var(--error)]">{error}</p> : null}
        {message ? <p className="mt-3 text-xs text-emerald-400">{message}</p> : null}

        <Button
          onClick={() => void handleSaveProfile()}
          disabled={saving}
          loading={saving}
          className="mt-4 rounded-2xl"
        >
          {saving ? "Saving…" : "Save Profile"}
        </Button>
      </Card>

      <Card className={`p-4 ${ownerPanelClass}`}>
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
              Security
            </p>
            <p className="text-sm font-semibold text-white">Change Password</p>
          </div>
        </div>

        {isDemo ? (
          <p className="text-[12px] text-[color:var(--fg-secondary)]">
            Password changes are not available in demo mode.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[color:var(--fg-secondary)]">
                Current password
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={pwSaving}
                placeholder="••••••••"
                className={`w-full ${ownerInputClass}`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[color:var(--fg-secondary)]">
                New password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={pwSaving}
                placeholder="Min. 8 characters"
                className={`w-full ${ownerInputClass}`}
              />
            </label>
            {pwError ? <p className="text-xs text-[color:var(--error)]">{pwError}</p> : null}
            {pwMessage ? <p className="text-xs text-emerald-400">{pwMessage}</p> : null}
            <Button
              onClick={() => void handleChangePassword()}
              disabled={pwSaving}
              loading={pwSaving}
              className="rounded-2xl"
            >
              {pwSaving ? "Changing…" : "Change Password"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
