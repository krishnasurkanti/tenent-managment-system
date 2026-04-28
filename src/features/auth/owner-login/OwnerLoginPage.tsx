"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { loginDemoOwner, loginOwner } from "@/services/auth/auth.service";

const featurePoints = [
  "Real-time alerts",
  "Smart rent tracking",
  "Simple control",
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || demoLoading) return;

    const missingFields = [
      !identifier.trim() ? "email" : null,
      !password.trim() ? "password" : null,
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setError(`Enter ${missingFields.join(" and ")} before logging in.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { response, data } = await loginOwner({
        phoneNumber: identifier,
        email: identifier,
        password,
      });

      if (!response.ok) {
        setError(data.message ?? "Unable to sign in.");
        return;
      }

      router.replace("/owner/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (loading || demoLoading) return;

    setDemoLoading(true);
    setError("");

    try {
      const { response, data } = await loginDemoOwner();

      if (!response.ok) {
        setError(data.message ?? "Unable to open demo.");
        return;
      }

      router.replace("/owner/dashboard");
      router.refresh();
    } catch {
      setError("Unable to open demo right now. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#090912] text-white [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_18px] [overflow-x:clip] [touch-action:pan-y]">

      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-between gap-3 border-b border-white/8 bg-[rgba(9,9,11,0.88)] px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-none text-[#f6f0e8]">HostelHub</p>
            <p className="mt-0.5 text-[11px] leading-none text-white/40">Tenant Management</p>
          </div>
        </div>
        <Link
          href="/super-admin/login"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#f2bb4d]/55 bg-[#1d1a19]/80 px-3.5 py-2 text-xs font-semibold text-[#ffd26a]"
        >
          <ShieldCheck className="h-4 w-4" />
          Admin Login
        </Link>
      </header>

      {/* Page content */}
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:grid lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-10 lg:py-10">

        {/* Desktop left marketing column */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[#ffd15a]">HostelHub</p>
          <h1 className="text-[clamp(2.4rem,4.5vw,3.4rem)] font-bold leading-[0.95] tracking-[-0.05em] text-[#f8f3eb]">
            Manage tenants.<br />
            <span className="text-[#ffd15a]">Never miss rent.</span>
          </h1>
          <div className="mt-6 space-y-3">
            {featurePoints.map((point) => (
              <div key={point} className="flex items-center gap-3 text-base text-[#e7ded2]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f7cb5f_0%,#ca8e1f_100%)] text-[#18120a]">
                  <Check className="h-4 w-4" />
                </span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="w-[min(calc(100vw-2rem),440px)] mx-auto lg:w-full lg:max-w-[440px] lg:mx-0">
          <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6 lg:p-7">

            {/* Mobile logo */}
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-[#f6f0e8]">HostelHub</p>
                <p className="mt-0.5 text-xs leading-none text-[#f6c44f]">Tenant Management</p>
              </div>
            </div>

            <h2 className="text-[1.55rem] font-bold tracking-[-0.04em] text-[#f7f0e8] sm:text-[1.9rem]">Welcome Back</h2>
            <p className="mt-1 text-sm text-white/45">Login to your account</p>

            <form onSubmit={handleLogin} className="mt-5 space-y-3">
              <label className="block">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    inputMode="email"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    disabled={loading || demoLoading}
                    placeholder="Email or Phone"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                </div>
              </label>

              <label className="block">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading || demoLoading}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 pr-12 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={loading || demoLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error ? (
                <div role="alert" className="rounded-2xl border border-[#cf4637] bg-[#3a1718]/85 px-4 py-3 text-sm text-[#ffb7ae]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={loading || demoLoading}
                  className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-bold text-[#1b1207] shadow-[0_10px_24px_rgba(240,175,47,0.22)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? "Checking..." : "Login"}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading || demoLoading}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07] disabled:opacity-50"
                >
                  {demoLoading ? "Opening demo..." : "Try Demo Workspace"}
                </button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-white/38">Don&apos;t have an account?</p>
              <Link
                href="/owner/signup"
                className="mt-1.5 inline-flex items-center justify-center gap-1 text-lg font-bold text-[#f5be4e] transition hover:text-[#ffd983]"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
