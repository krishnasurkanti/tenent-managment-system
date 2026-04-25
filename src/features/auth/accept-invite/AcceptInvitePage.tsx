"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, Lock, MapPin, Phone, ShieldCheck, User } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";

type InviteDetails = {
  email: string;
  pgName: string;
  expiresAt: string;
};

type PageState = "loading" | "invalid" | "form" | "done";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [invalidReason, setInvalidReason] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        const data = (await res.json()) as { ok?: boolean; invitation?: InviteDetails; message?: string };
        if (!res.ok || !data.invitation) {
          setInvalidReason(data.message ?? "This invitation link is invalid or expired.");
          setPageState("invalid");
          return;
        }
        setInvite(data.invitation);
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

    if (!name.trim()) { setFormError("Enter your full name."); return; }
    if (!address.trim()) { setFormError("Enter your property address."); return; }
    if (password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setFormError("Passwords do not match."); return; }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await csrfFetch(`/api/owner/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phoneNumber: phone.trim() || undefined, password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setFormError(data.message ?? "Failed to create account.");
        return;
      }
      setPageState("done");
      const params = new URLSearchParams();
      if (invite?.pgName) params.set("pgName", invite.pgName);
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
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white"
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
    <main className="h-dvh overflow-y-auto overscroll-contain bg-[#090912] px-2 py-2 text-white sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-[8px] border border-white/10 bg-[radial-gradient(circle_at_20%_38%,rgba(33,76,142,0.22),transparent_22%),radial-gradient(circle_at_56%_72%,rgba(245,168,39,0.18),transparent_18%),linear-gradient(180deg,#0d0f1a_0%,#090b14_100%)] shadow-[0_36px_100px_rgba(0,0,0,0.42)] sm:min-h-[calc(100dvh-2rem)] lg:rounded-[10px]">

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/8 px-3 py-2.5 sm:px-5 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-[#f6f0e8]">Tenant Management System</p>
              <p className="text-xs leading-none text-white/40 mt-0.5">Owner setup</p>
            </div>
          </div>
          <a href="/login" className="text-xs font-medium text-white/40 hover:text-white/70 transition">Sign in instead</a>
        </div>

        {/* Content */}
        <div className="flex flex-1 items-start justify-center px-3 py-6 sm:px-5 sm:py-8 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-8 lg:px-8 lg:py-10">

          {/* Left — invite context (desktop only) */}
          <div className="hidden lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/[0.08] px-3.5 py-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f7bf53]">You&apos;re invited</span>
              </div>
              <h1 className="mt-5 text-[clamp(2rem,3.5vw,2.8rem)] font-semibold leading-[0.97] tracking-[-0.05em] text-[#f8f3eb]">
                Set up your<br />
                <span className="text-[#ffd15a]">{invite?.pgName ? invite.pgName : "owner account"}</span>
              </h1>
              <p className="mt-4 text-base text-white/50 leading-relaxed">
                You&apos;ve been invited to manage your property on Tenant Management System. Complete your account setup below.
              </p>
              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Signing in as</p>
                <p className="mt-1 font-mono text-sm text-white/70">{invite?.email}</p>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="w-full max-w-md lg:max-w-none">
            {/* Mobile invite banner */}
            <div className="mb-5 rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.06] px-4 py-3 lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f7bf53]">You&apos;re invited</p>
              {invite?.pgName ? (
                <p className="mt-0.5 text-sm font-semibold text-white">
                  Set up your account for <span className="text-[#fcd34d]">{invite.pgName}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-white">Set up your owner account</p>
              )}
              <p className="mt-1 text-xs text-white/50">
                Signing in as <span className="font-mono text-white/70">{invite?.email}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.92)_0%,rgba(15,17,31,0.96)_100%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] sm:p-6">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#f7f0e8]">Create your account</h2>
              <p className="mt-1 text-sm text-white/45">Your email is pre-set. Add your name and a password to get started.</p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                {/* Email — read-only */}
                <div>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Email</span>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/60">
                    {invite?.email}
                  </div>
                </div>

                {/* Name */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Full Name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={submitting}
                      placeholder="e.g. Raghuveer Reddy"
                      autoComplete="name"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]"
                    />
                  </div>
                </label>

                {/* Phone */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                    Phone Number <span className="normal-case font-normal text-white/30">(optional)</span>
                  </span>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      disabled={submitting}
                      placeholder="10-digit mobile number"
                      autoComplete="tel"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]"
                    />
                  </div>
                </label>

                {/* Address */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Property Address</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={submitting}
                      placeholder="Full address of your PG / hostel"
                      autoComplete="street-address"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]"
                    />
                  </div>
                </label>

                {/* Password */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      aria-label={showPassword ? "Hide" : "Show"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {/* Confirm Password */}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Confirm Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      aria-label={showConfirm ? "Hide" : "Show"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {formError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {formError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105 disabled:opacity-60 sm:min-h-12"
                >
                  {submitting ? "Creating account…" : "Create Account & Login"}
                  {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
