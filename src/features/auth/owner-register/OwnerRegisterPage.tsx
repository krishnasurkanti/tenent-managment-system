"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { registerOwner } from "@/services/auth/auth.service";

const reasons = [
  "Create a real owner account in the backend database",
  "Sign in with your own email and password",
  "Test actual hostel, tenant, and payment flows",
];

export default function OwnerRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Enter email, password, and confirm password before continuing.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { response, data } = await registerOwner({
        email,
        password,
      });

      if (!response.ok) {
        setError(data.message ?? "Unable to create account.");
        return;
      }

      router.replace("/owner/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-[linear-gradient(180deg,var(--bg-primary)_0%,color-mix(in_srgb,var(--bg-surface)_88%,white)_42%,color-mix(in_srgb,var(--bg-elevated)_85%,white)_100%)] px-4 py-3 text-[color:var(--fg-primary)] lg:px-6 lg:py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <header className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-electric)] shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Real Owner Setup
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3.5 text-sm font-semibold text-[color:var(--accent-electric)] shadow-sm backdrop-blur"
          >
            Back to Login
          </Link>
        </header>

        <section className="relative flex flex-1 items-center py-3 lg:py-5">
          <div className="relative grid w-full gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center xl:gap-10">
            <div className="rounded-[36px] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--hero-gradient)_0%,var(--brand)_100%)] p-8 text-white shadow-[0_34px_90px_color-mix(in_srgb,var(--brand)_24%,transparent)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-primary)]">
                <Building2 className="h-3.5 w-3.5" />
                Live Backend Access
              </div>
              <h1 className="mt-5 max-w-lg text-[3rem] font-semibold leading-[0.95] tracking-[-0.05em]">
                Create a real owner login for this app.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[color:color-mix(in_srgb,var(--fg-primary)_80%,transparent)]">
                This account is stored by the backend, so you can test with real login sessions instead of the old demo shortcut.
              </p>
              <div className="mt-6 grid gap-3">
                {reasons.map((reason) => (
                  <div key={reason} className="flex items-center gap-3 rounded-[22px] bg-[color:var(--surface-soft)] px-4 py-3 backdrop-blur">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[color:var(--fg-primary)]" />
                    <p className="text-sm text-white">{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bg-elevated)_82%,white)_0%,color-mix(in_srgb,var(--bg-surface)_70%,white)_100%)] p-4 shadow-[0_24px_50px_rgba(15,23,42,0.16)] backdrop-blur lg:p-6"
            >
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Owner sign up</p>
                <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[color:var(--fg-primary)]">Create account</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--fg-secondary)]">
                  Use an email address you control. After sign up, you will be logged in automatically.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--fg-secondary)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading}
                      placeholder="owner@hostel.com"
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3.5 py-3 pl-10 text-sm text-[color:var(--fg-primary)] outline-none transition focus:border-[color:var(--brand)] focus:bg-[color:var(--bg-surface)]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--fg-secondary)]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      placeholder="At least 8 characters"
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3.5 py-3 pl-10 pr-12 text-sm text-[color:var(--fg-primary)] outline-none transition focus:border-[color:var(--brand)] focus:bg-[color:var(--bg-surface)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--fg-secondary)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Confirm password</span>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--fg-secondary)]" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={loading}
                      placeholder="Re-enter password"
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3.5 py-3 pl-10 pr-12 text-sm text-[color:var(--fg-primary)] outline-none transition focus:border-[color:var(--brand)] focus:bg-[color:var(--bg-surface)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--fg-secondary)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] px-4 text-base font-semibold text-white shadow-[0_18px_38px_color-mix(in_srgb,var(--cta)_28%,transparent)] transition hover:opacity-95"
                >
                  {loading ? "Creating..." : "Create Owner Account"}
                </button>

                {error ? (
                  <div className="rounded-2xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">{error}</div>
                ) : null}
              </div>

              <div className="mt-4 rounded-[22px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Already have an account?</p>
                <Link href="/login" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent-electric)]">
                  Go to owner login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
