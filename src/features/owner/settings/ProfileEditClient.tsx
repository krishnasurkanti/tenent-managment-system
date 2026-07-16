"use client";

import { useEffect, useState } from "react";
import { KeyRound, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
import { csrfFetch } from "@/lib/csrf-client";

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
    <div className="flex flex-col gap-3">
      {/* Account */}
      <Card className="p-4">
        <SectionHead icon={<UserCircle size={16} />} eyebrow="Account" title="Owner profile" />
        {profile ? <p className="mb-3 text-[11px] text-[color:var(--fg-secondary)]">{profile.email}</p> : null}

        <div className="flex flex-col gap-3">
          <FormField label="Name" error={error && !name.trim() ? error : undefined}>
            {({ id }) => (
              <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} disabled={saving} placeholder="Your name" />
            )}
          </FormField>
          <FormField label="Phone">
            {({ id }) => (
              <TextInput id={id} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} placeholder="Phone number (optional)" />
            )}
          </FormField>
        </div>

        {error && name.trim() ? <p className="mt-3 text-xs text-[color:var(--error)]">{error}</p> : null}
        {message ? <p className="mt-3 text-xs text-[color:var(--success)]">{message}</p> : null}

        <Button onClick={() => void handleSaveProfile()} disabled={saving} loading={saving} className="mt-4">
          {saving ? "Saving…" : "Save Profile"}
        </Button>
      </Card>

      {/* Security */}
      <Card className="p-4">
        <SectionHead icon={<KeyRound size={16} />} eyebrow="Security" title="Change password" />
        {isDemo ? (
          <p className="text-[12px] text-[color:var(--fg-secondary)]">Password changes are not available in demo mode.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <FormField label="Current password">
              {({ id }) => (
                <TextInput id={id} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={pwSaving} placeholder="••••••••" />
              )}
            </FormField>
            <FormField label="New password" helper="Minimum 8 characters">
              {({ id }) => (
                <TextInput id={id} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={pwSaving} placeholder="Min. 8 characters" />
              )}
            </FormField>
            {pwError ? <p className="text-xs text-[color:var(--error)]">{pwError}</p> : null}
            {pwMessage ? <p className="text-xs text-[color:var(--success)]">{pwMessage}</p> : null}
            <Button onClick={() => void handleChangePassword()} disabled={pwSaving} loading={pwSaving} className="self-start">
              {pwSaving ? "Changing…" : "Change Password"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function SectionHead({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{eyebrow}</p>
        <p className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">{title}</p>
      </div>
    </div>
  );
}
