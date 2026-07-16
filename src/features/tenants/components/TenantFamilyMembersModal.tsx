"use client";

import { useEffect, useState } from "react";
import { Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay/modal";
import { TextInput } from "@/components/ui/form/text-input";
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

  /* eslint-disable react-hooks/set-state-in-effect -- sync tenant props into form state when the modal opens */
  useEffect(() => {
    if (!open || !tenant) return;
    if (tenant.familyMembers && tenant.familyMembers.length > 0) {
      setMembers(tenant.familyMembers.map((m) => ({
        id: `family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: m.name,
        relation: m.relation,
        age: m.age !== undefined ? String(m.age) : "",
      })));
    } else {
      setMembers([createFamilyMember()]);
    }
    setError("");
  }, [open, tenant]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open || !tenant) return null;

  const handleSave = async () => {
    const cleaned = members
      .map((member) => ({
        name: member.name.trim(),
        relation: member.relation.trim(),
        age: member.age ? Number(member.age) : undefined,
      }))
      .filter((member) => member.name || member.relation || member.age !== undefined);

    if (cleaned.length === 0) return setError("Add at least one family member.");

    const hasInvalid = cleaned.some(
      (member) => !member.name || !member.relation || (member.age !== undefined && (!Number.isFinite(member.age) || member.age < 0)),
    );
    if (hasInvalid) return setError("Each family member needs name and relation. Age must be valid.");
    if (saving) return;

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

  const patch = (id: string, key: keyof FamilyMemberForm, value: string) =>
    setMembers((current) => current.map((entry) => (entry.id === id ? { ...entry, [key]: value } : entry)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Family members"
      description="Add family details for a residence tenant before assigning the unit."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving} className="sm:flex-1">Later</Button>
          <Button fullWidth onClick={handleSave} loading={saving} className="sm:flex-1">
            {saving ? "Saving…" : "Save and Continue"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[color:var(--fg-secondary)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--cta)] text-white"><Users2 size={13} /></span>
            Members
          </span>
          <Button variant="secondary" size="small" disabled={saving} onClick={() => setMembers((c) => [...c, createFamilyMember()])}>
            Add Member
          </Button>
        </div>

        {members.map((member, index) => (
          <div key={member.id} className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-[color:var(--fg-secondary)]">Member {index + 1}</p>
              {members.length > 1 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setMembers((c) => c.filter((entry) => entry.id !== member.id))}
                  className="text-[11px] font-semibold text-[color:var(--error)]"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <TextInput value={member.name} onChange={(e) => patch(member.id, "name", e.target.value)} disabled={saving} placeholder="Name" />
              <TextInput value={member.relation} onChange={(e) => patch(member.id, "relation", e.target.value)} disabled={saving} placeholder="Relation" />
              <TextInput value={member.age} onChange={(e) => patch(member.id, "age", e.target.value.replace(/\D/g, ""))} inputMode="numeric" disabled={saving} placeholder="Age (optional)" />
            </div>
          </div>
        ))}

        {error ? (
          <div role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
