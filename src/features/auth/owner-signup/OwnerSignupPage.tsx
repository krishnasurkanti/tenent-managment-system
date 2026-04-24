"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, User } from "lucide-react";

type Step = "loading" | "invalid" | "account" | "hostel" | "submitting" | "done";

export default function OwnerSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";

  const [step, setStep] = useState<Step>("loading");
  const [invalidReason, setInvalidReason] = useState("");

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Hostel fields
  const [hostelName, setHostelName] = useState("");
  const [hostelAddress, setHostelAddress] = useState("");
  const [hostelType, setHostelType] = useState<"PG" | "RESIDENCE">("PG");

  const [error, setError] = useState("");

  useEffect(() => {
    if (!key) {
      setInvalidReason("No signup key in this link. Contact admin.");
      setStep("invalid");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/owner/signup/validate?key=${encodeURIComponent(key)}`);
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok) {
          setInvalidReason(data.message ?? "This signup link is invalid or already used.");
          setStep("invalid");
          return;
        }
        setStep("account");
      } catch {
        setInvalidReason("Unable to verify link. Check your connection.");
        setStep("invalid");
      }
    })();
  }, [key]);

  const handleAccountNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) { setError("Enter your full name."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setStep("hostel");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!hostelName.trim()) { setError("Enter your hostel name."); return; }
    if (!hostelAddress.trim()) { setError("Enter your hostel address."); return; }

    setStep("submitting");

    try {
      const res = await fetch("/api/owner/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phone.trim() || undefined,
          password,
          hostelName: hostelName.trim(),
          hostelAddress: hostelAddress.trim(),
          hostelType,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Registration failed.");
        setStep("hostel");
        return;
      }
      setStep("done");
      router.replace("/owner/dashboard");
      router.refresh();
    } catch {
      setError("Unable to register. Try again.");
      setStep("hostel");
    }
  };

  if (step === "loading") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f7bf53]" />
          <p className="mt-3 text-sm text-white/50">Verifying link…</p>
        </div>
      </main>
    );
  }

  if (step === "invalid") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] px-4 text-white">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
            <ShieldCheck className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Link not valid</h1>
          <p className="mt-2 text-sm text-white/50">{invalidReason}</p>
          <a href="/login" className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white">
            Go to login
          </a>
        </div>
      </main>
    );
  }

  if (step === "done" || step === "submitting") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#4ade80]" />
          <p className="mt-3 text-sm text-white/50">
            {step === "submitting" ? "Creating your account…" : "Taking you to your dashboard…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-y-auto bg-[#090912] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-md">

        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f6f0e8]">Tenant Management System</p>
            <p className="text-xs text-white/40">Owner registration</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-5 flex items-center gap-2">
          {(["account", "hostel"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${step === s ? "bg-[#f7bf53] text-[#1b1207]" : step === "hostel" && s === "account" ? "bg-[#22c55e] text-white" : "bg-white/10 text-white/40"}`}>
                {step === "hostel" && s === "account" ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === s ? "text-white" : "text-white/35"}`}>
                {s === "account" ? "Your Account" : "Your Hostel"}
              </span>
              {i === 0 && <div className="mx-1 h-px w-6 bg-white/15" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.92)_0%,rgba(15,17,31,0.96)_100%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">

          {step === "account" && (
            <>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#f7f0e8]">Set up your account</h1>
              <p className="mt-1 text-sm text-white/45">This is your login. You&apos;ll use your email or phone to sign in.</p>

              <form onSubmit={handleAccountNext} className="mt-5 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Full Name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Raghuveer Reddy" autoComplete="name"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                    Phone <span className="normal-case font-normal text-white/30">(optional — also used to login)</span>
                  </span>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input type="tel" inputMode="numeric" value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number" autoComplete="tel"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters" autoComplete="new-password"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Confirm Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password" autoComplete="new-password"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                    <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105">
                  Next: Your Hostel <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {step === "hostel" && (
            <>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#f7f0e8]">Your hostel details</h1>
              <p className="mt-1 text-sm text-white/45">Add rooms and floors after login. Just name and address for now.</p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Hostel / PG Name</span>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input type="text" value={hostelName} onChange={(e) => setHostelName(e.target.value)}
                      placeholder="e.g. Sai Krishna PG" autoComplete="off"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Address</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <textarea value={hostelAddress} onChange={(e) => setHostelAddress(e.target.value)}
                      placeholder="Full address" rows={2} autoComplete="off"
                      className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                  </div>
                </label>

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Type</span>
                  <div className="flex gap-2">
                    {(["PG", "RESIDENCE"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setHostelType(t)}
                        className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${hostelType === t ? "border-[#f2bb4d]/50 bg-[#f7bf53]/12 text-[#fcd34d]" : "border-white/12 bg-white/[0.03] text-white/50 hover:text-white"}`}>
                        {t === "PG" ? "PG / Hostel" : "Residence"}
                      </button>
                    ))}
                  </div>
                </div>

                {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

                <div className="flex gap-2">
                  <button type="button" onClick={() => { setStep("account"); setError(""); }}
                    className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white">
                    Back
                  </button>
                  <button type="submit"
                    className="inline-flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105">
                    Create Account &amp; Hostel <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-white/30">
          Already have an account?{" "}
          <a href="/login" className="text-[#f7bf53] hover:text-[#ffd983]">Sign in</a>
        </p>
      </div>
    </main>
  );
}
