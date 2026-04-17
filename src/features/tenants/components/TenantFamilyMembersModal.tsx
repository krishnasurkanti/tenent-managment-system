"use client";

import { useState } from "react";
import { Users2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { updateTenantFamilyMembers } from "@/services/tenants/tenants.service";
import type { TenantFamilyMember, TenantRecord } from "@/types/tenant";

type FamilyMemberForm = {
  id: string;
  name: string;
  relation: string;
  age: string;
};

function createFamilyMember(): FamilyMemberForm {
  return {
    id: `family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    relation: "",
    age: "",
  };
}

export function TenantFamilyMembersModal({
  open,
  tenant,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenant: TenantRecord | null;
  onClose: () => void;
  onSaved: (tenant: TenantRecord) => void;
}) {
  const [members, setMembers] = useState<FamilyMemberForm[]>([createFamilyMember()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  if (!open || !tenant) {
    return null;
  }

  const handleSave = async () => {
    const cleaned = members
      .map((member) => ({
        name: member.name.trim(),
        relation: member.relation.trim(),
        age: member.age ? Number(member.age) : undefined,
      }))
      .filter((member) => member.name || member.relation || member.age !== undefined);

    if (cleaned.length === 0) {
      setError("Add at least one family member.");
      return;
    }

    const hasInvalid = cleaned.some(
      (member) => !member.name || !member.relation || (member.age !== undefined && (!Number.isFinite(member.age) || member.age < 0)),
    );

    if (hasInvalid) {
      setError("Each family member needs name and relation. Age must be valid.");
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    const { response, data } = await updateTenantFamilyMembers({
      tenantId: tenant.tenantId,
      familyMembers: cleaned as TenantFamilyMember[],
    });

    if (!response.ok || !data.tenant) {
      setError(data.message ?? "Unable to save family members.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved(data.tenant);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex min-h-full items-center justify-center">
        <Card className="w-full max-w-2xl border-slate-100 bg-white p-0 shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
          <div className="flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/72 px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm">
                <span className="rounded-[8px] bg-blue-600 p-1 text-white">
                  <Users2 className="h-3.5 w-3.5" />
                </span>
                Family Members
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Add family details for residence tenant before assigning the unit.
              </p>
            </div>
            <Button variant="ghost" disabled={saving} aria-label="Close" className="rounded-[var(--radius-pill)] px-3 text-slate-500" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setMembers((current) => [...current, createFamilyMember()])}
                className="h-8 rounded-xl px-3 text-[11px]"
              >
                Add Member
              </Button>
            </div>
            {members.map((member, index) => (
              <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-600">Member {index + 1}</p>
                  {members.length > 1 ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setMembers((current) => current.filter((entry) => entry.id !== member.id))}
                      className="text-[11px] font-semibold text-[color:var(--error)]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={member.name}
                    onChange={(event) =>
                      setMembers((current) => current.map((entry) => (entry.id === member.id ? { ...entry, name: event.target.value } : entry)))
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none"
                    placeholder="Name"
                  />
                  <input
                    value={member.relation}
                    onChange={(event) =>
                      setMembers((current) =>
                        current.map((entry) => (entry.id === member.id ? { ...entry, relation: event.target.value } : entry)),
                      )
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none"
                    placeholder="Relation"
                  />
                  <input
                    type="number"
                    min="0"
                    value={member.age}
                    onChange={(event) =>
                      setMembers((current) => current.map((entry) => (entry.id === member.id ? { ...entry, age: event.target.value } : entry)))
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none"
                    placeholder="Age (optional)"
                  />
                </div>
              </div>
            ))}

            {error ? <div className="rounded-2xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">{error}</div> : null}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button variant="secondary" onClick={onClose} disabled={saving} className="w-full rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm sm:flex-1">
                Later
              </Button>
              <Button onClick={handleSave} disabled={saving} loading={saving} className="w-full rounded-2xl sm:flex-1">
                {saving ? "Saving..." : "Save and Continue"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
