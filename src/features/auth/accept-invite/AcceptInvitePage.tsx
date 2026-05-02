"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, User } from "lucide-react";
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

    if (!email.trim() || !email.includes("@")) { setFormError("Enter a valid email address."); return; }
    if (!name.trim()) { setFormError("Enter your full name."); return; }
    if (!hostelName.trim()) { setFormError("Enter your hostel / PG name."); return; }
    if (!address.trim()) { setFormError("Enter your property address."); return; }
    if (password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setFormError("Passwords do not match."); return; }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await csrfFetch(`/api/owner/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phoneNumber: phone.trim() || undefined,
          password,
        }),
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

  if (pageState === "loading") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f7bf53]" />
          <p className="mt-3 text-sm text-white/50">Verifying invitation…</p>
        </div>
      </main>
    );
  }

  if (pageState === "invalid") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] px-4 text-white">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
            <ShieldCheck className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">Link not valid</h1>
          <p className="mt-2 text-sm text-white/50">{invalidReason}</p>
          <a
            href="/owner/login"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white"
          >
            Go to login
          </a>
        </div>
      </main>
    );
  }

  if (pageState === "done") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#4ade80]" />
          <p className="mt-3 text-sm text-white/50">Setting up your property…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#090912] text-white [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_18px]">

      {/* Top bar */}
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-between gap-3 border-b border-white/8 bg-[rgba(9,9,11,0.88)] px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-none text-[#f6f0e8]">HostelHub</p>
            <p className="mt-0.5 text-[11px] leading-none text-white/40">Owner setup</p>
          </div>
        </div>
        <a href="/owner/login" className="shrink-0 text-xs font-medium text-white/40 transition hover:text-white/70">
          Sign in instead
        </a>
      </header>

      <div className="mx-auto w-full max-w-[520px] px-4 py-6 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10">

        {/* Invite banner */}
        <div className="mb-5 rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.06] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f7bf53]">You&apos;re invited</p>
          <p className="mt-0.5 text-sm font-semibold text-white">Set up your owner account on HostelHub</p>
          {expiresAt ? (
            <p className="mt-1 text-xs text-white/40">
              Link expires {new Date(expiresAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5">
          <h2 className="text-[1.4rem] font-bold tracking-[-0.03em] text-[#f7f0e8]">Create your account</h2>
          <p className="mt-1 text-sm text-white/40">Fill in your details to get started.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">

            {/* Email */}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                />
              </div>
            </label>

            {/* Full Name */}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Full Name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. Raghuveer Reddy"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                />
              </div>
            </label>

            {/* Phone */}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Phone <span className="normal-case font-normal text-white/30">(optional)</span>
              </span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  disabled={submitting}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                />
              </div>
            </label>

            <div className="border-t border-white/8 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Property details</p>

              {/* Hostel Name */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Hostel / PG Name</span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={hostelName}
                    onChange={(e) => setHostelName(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Skykine PG"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                </div>
              </label>

              {/* Address */}
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Property Address</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={submitting}
                    placeholder="Full address of your PG / hostel"
                    autoComplete="street-address"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                </div>
              </label>
            </div>

            <div className="border-t border-white/8 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Set password</p>

              {/* Password */}
              <label className="block">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 pr-12 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} disabled={submitting}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {/* Confirm */}
              <label className="mt-3 block">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 pr-12 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                  <button type="button" onClick={() => setShowConfirm((s) => !s)} disabled={submitting}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {formError ? (
              <div role="alert" className="rounded-2xl border border-[#cf4637] bg-[#3a1718]/85 px-4 py-3 text-sm text-[#ffb7ae]">
                {formError}
              </div>
            ) : null}

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-bold text-[#1b1207] shadow-[0_10px_24px_rgba(240,175,47,0.22)] transition hover:brightness-105 disabled:opacity-60"
              >
                {submitting ? "Creating account…" : "Create Account & Continue"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
