"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
import { csrfFetch } from "@/lib/csrf-client";

type PageState = "loading" | "invalid" | "form" | "done";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invalidReason, setInvalidReason] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostelName, setHostelName] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) {
      setInvalidReason("No invitation token found in this link.");
      setPageState("invalid");
      return;
    }

    void (async () => {
      try {
        const res = await fetch(`/api/owner/invitations/${encodeURIComponent(token)}`);
        const data = (await res.json()) as { ok?: boolean; invitation?: { expiresAt?: string }; message?: string };
        if (!res.ok || !data.invitation) {
          setInvalidReason(data.message ?? "This invitation link is invalid or expired.");
          setPageState("invalid");
          return;
        }
        if (data.invitation.expiresAt) setExpiresAt(data.invitation.expiresAt);
        setPageState("form");
      } catch {
        setInvalidReason("Unable to verify invitation. Check your connection.");
        setPageState("invalid");
      }
    })();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim() || !email.includes("@")) return setFormError("Enter a valid email address.");
    if (!name.trim()) return setFormError("Enter your full name.");
    if (!hostelName.trim()) return setFormError("Enter your hostel / PG name.");
    if (!address.trim()) return setFormError("Enter your property address.");
    if (password.length < 6) return setFormError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setFormError("Passwords do not match.");

    setSubmitting(true);
    setFormError("");

    try {
      const res = await csrfFetch(`/api/owner/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim(), phoneNumber: phone.trim() || undefined, password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setFormError(data.message ?? "Failed to create account.");
        return;
      }
      setPageState("done");
      const params = new URLSearchParams();
      if (hostelName.trim()) params.set("pgName", hostelName.trim());
      if (address.trim()) params.set("address", address.trim());
      params.set("autoSetup", "1");
      router.replace(`/owner/create-hostel?${params.toString()}`);
      router.refresh();
    } catch {
      setFormError("Unable to create account. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (pageState === "loading" || pageState === "done") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-3 text-sm text-[color:var(--fg-secondary)]">{pageState === "loading" ? "Verifying invitation…" : "Setting up your property…"}</p>
        </div>
      </main>
    );
  }

  if (pageState === "invalid") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[color:var(--bg-primary)] px-4 text-[color:var(--fg-primary)]">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[color:var(--error-soft)]">
            <ShieldCheck className="h-7 w-7 text-[color:var(--error)]" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[color:var(--fg-primary)]">Link not valid</h1>
          <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">{invalidReason}</p>
          <a href="/owner/login" className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-5 py-2.5 text-sm font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
            Go to login
          </a>
        </div>
      </main>
    );
  }

  const pwToggle = (shown: boolean, set: () => void) => (
    <button type="button" onClick={set} disabled={submitting} aria-label={shown ? "Hide password" : "Show password"} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]">
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-primary)]/85 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-none text-[color:var(--fg-primary)]">HostelHub</p>
            <p className="mt-0.5 text-[11px] leading-none text-[color:var(--fg-tertiary)]">Owner setup</p>
          </div>
        </div>
        <a href="/owner/login" className="shrink-0 text-xs font-medium text-[color:var(--fg-tertiary)] transition hover:text-[color:var(--fg-secondary)]">Sign in instead</a>
      </header>

      <div className="mx-auto w-full max-w-[520px] px-4 py-6 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <div className="mb-5 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--brand)_25%,transparent)] bg-[color:var(--brand-soft)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">You&apos;re invited</p>
          <p className="mt-0.5 text-sm font-semibold text-[color:var(--fg-primary)]">Set up your owner account on HostelHub</p>
          {expiresAt ? <p className="mt-1 text-xs text-[color:var(--fg-tertiary)]">Link expires {new Date(expiresAt).toLocaleString()}</p> : null}
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-4 shadow-[var(--shadow-4)] backdrop-blur-xl sm:p-5">
          <h2 className="font-display text-[1.4rem] font-bold tracking-[-0.02em] text-[color:var(--fg-primary)]">Create your account</h2>
          <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Fill in your details to get started.</p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <FormField label="Email">
              {({ id }) => <TextInput id={id} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} placeholder="your@email.com" autoComplete="email" leadingIcon={<Mail size={16} />} />}
            </FormField>
            <FormField label="Full name">
              {({ id }) => <TextInput id={id} type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} placeholder="e.g. Raghuveer Reddy" autoComplete="name" leadingIcon={<User size={16} />} />}
            </FormField>
            <FormField label="Phone (optional)">
              {({ id }) => <TextInput id={id} type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} disabled={submitting} placeholder="10-digit mobile number" autoComplete="tel" leadingIcon={<Phone size={16} />} />}
            </FormField>

            <div className="border-t border-[color:var(--border)] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Property details</p>
              <div className="flex flex-col gap-3">
                <FormField label="Hostel / PG name">
                  {({ id }) => <TextInput id={id} type="text" value={hostelName} onChange={(e) => setHostelName(e.target.value)} disabled={submitting} placeholder="e.g. Skykine PG" leadingIcon={<Building2 size={16} />} />}
                </FormField>
                <FormField label="Property address">
                  {({ id }) => <TextInput id={id} type="text" value={address} onChange={(e) => setAddress(e.target.value)} disabled={submitting} placeholder="Full address of your PG / hostel" autoComplete="street-address" leadingIcon={<MapPin size={16} />} />}
                </FormField>
              </div>
            </div>

            <div className="border-t border-[color:var(--border)] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Set password</p>
              <div className="flex flex-col gap-3">
                <TextInput type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} placeholder="Min 6 characters" autoComplete="new-password" leadingIcon={<Lock size={16} />} trailingIcon={pwToggle(showPassword, () => setShowPassword((s) => !s))} />
                <TextInput type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={submitting} placeholder="Re-enter password" autoComplete="new-password" leadingIcon={<Lock size={16} />} trailingIcon={pwToggle(showConfirm, () => setShowConfirm((s) => !s))} />
              </div>
            </div>

            {formError ? (
              <div role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">{formError}</div>
            ) : null}

            <div className="pt-1">
              <Button type="submit" fullWidth disabled={submitting} loading={submitting} className="min-h-[50px] text-base">
                {submitting ? "Creating account…" : <>Create Account & Continue <ArrowRight size={16} /></>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
