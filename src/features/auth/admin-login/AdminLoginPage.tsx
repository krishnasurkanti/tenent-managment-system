"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ServerCog,
  Shield,
} from "lucide-react";
import { loginAdmin } from "@/services/auth/auth.service";

const adminPoints = [
  "Billing and hostel oversight",
  "Owner access review",
  "Platform-wide monitoring",
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    if (!identifier.trim() || !password.trim()) {
      setError("Username or email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { response, data } = await loginAdmin({
        phoneNumber: identifier,
        email: identifier,
        password,
      });
      if (!response.ok) {
        setError(data.message ?? "Unable to sign in.");
        return;
      }

      router.replace("/super-admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#090912] text-white">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-[8px] border border-white/10 bg-[radial-gradient(circle_at_18%_36%,rgba(57,77,160,0.22),transparent_24%),radial-gradient(circle_at_60%_75%,rgba(236,172,66,0.18),transparent_18%),linear-gradient(180deg,#0d0f1a_0%,#090b14_100%)] shadow-[0_36px_100px_rgba(0,0,0,0.42)] sm:min-h-[calc(100dvh-2rem)] lg:rounded-[10px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:14px_14px] opacity-20" />

        <div className="smart-scroll-header relative z-10 flex items-center justify-end border-b border-white/8 px-3 py-2.5 sm:px-5 lg:px-6">
          <Link
            href="/owner/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#f2bb4d]/55 bg-[#1d1a19]/80 px-3.5 py-2 text-xs font-semibold text-[#ffd26a] shadow-[0_0_0_1px_rgba(255,214,120,0.08)_inset] sm:text-sm"
          >
            <Shield className="h-4 w-4" />
            Owner Login
          </Link>
        </div>

        <section className="smart-scroll-area smart-scroll-fade relative">
          <div className="grid gap-4 px-3 py-3 sm:px-5 sm:py-5 lg:grid-cols-[1fr_0.92fr] lg:items-start lg:gap-6 lg:px-8 lg:pt-4 lg:pb-6">
          <div className="hidden lg:flex lg:flex-col lg:justify-start lg:pt-2">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a] shadow-[0_18px_40px_rgba(245,177,52,0.18)]">
                  <ServerCog className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-semibold leading-none text-[#f6f0e8]">Platform</p>
                  <p className="text-xl font-semibold leading-none text-[#f6c44f]">Admin Console</p>
                </div>
              </div>

              <h1 className="mt-7 text-[clamp(2.55rem,4.4vw,3.5rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#f8f3eb]">
                Control billing.
                <span className="mt-1.5 block text-[#ffd15a]">Review every hostel.</span>
              </h1>

              <div className="mt-6 space-y-3">
                {adminPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 text-base text-[#e7ded2] xl:text-lg">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f7cb5f_0%,#ca8e1f_100%)] text-[#18120a] shadow-[0_10px_20px_rgba(241,187,58,0.16)]">
                      <Check className="h-4 w-4" />
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 hidden 2xl:block [@media(max-height:1180px)]:hidden">
              <div className="rounded-[10px] border border-[#253556] bg-[linear-gradient(180deg,rgba(12,17,34,0.96)_0%,rgba(8,11,22,0.96)_100%)] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.32)]">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Desktop Preview</div>
                  <div className="rounded-full border border-[#f2bb4d]/30 bg-[#231c15] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f7bf53]">
                    Admin control
                  </div>
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-[190px_minmax(0,1fr)]">
                  <div className="rounded-[8px] border border-white/8 bg-white/[0.03] p-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">Billing Queue</div>
                    <div className="mt-2 text-2xl font-semibold text-[#f7f0e8]">12 Pending</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricCard value="46" label="Owners" />
                      <MetricCard value="7" label="Flags" />
                    </div>
                  </div>
                  <div className="rounded-[8px] border border-white/8 bg-white/[0.03] p-3.5">
                    <div className="space-y-2">
                      {[
                        ["Aurora Residency", "Pending"],
                        ["Lotus Elite Stay", "Upgrade"],
                        ["Skyline Comforts", "Healthy"],
                      ].map(([name, status]) => (
                        <div key={name} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                          <span className="text-sm font-medium text-[#f8f2ea]">{name}</span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f5be4e]">{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-center py-1 lg:sticky lg:top-6 lg:justify-end">
            <div className="w-full max-w-md">
              <div className="rounded-[8px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,22,38,0.92)_0%,rgba(15,17,31,0.96)_100%)] p-3.5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-5 lg:rounded-[10px] lg:p-5 xl:p-6">
                <div className="lg:hidden">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a] shadow-[0_16px_36px_rgba(245,177,52,0.18)]">
                      <ServerCog className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none text-[#f6f0e8]">Platform</p>
                      <p className="text-sm font-semibold leading-none text-[#f6c44f]">Admin Console</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center lg:mt-0">
                  <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-[#f7f0e8] sm:text-[1.9rem]">Welcome Back</h2>
                  <p className="mt-1 text-sm text-white/45 sm:text-base">Login to your admin account</p>
                </div>

                <form onSubmit={handleLogin} className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
                  <label className="block">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        disabled={loading}
                        placeholder="Email or Username"
                        className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-11 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05] sm:py-3.5 sm:text-base"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        placeholder="Password"
                        className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-11 pr-12 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05] sm:py-3.5 sm:text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <div className="flex items-center justify-end">
                    <button type="button" className="text-xs font-medium text-[#f7bf53] transition hover:text-[#ffd983] sm:text-sm">
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105 sm:min-h-12 sm:text-lg"
                  >
                    {loading ? "Checking..." : "Login"}
                    {!loading ? <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" /> : null}
                  </button>

                  {error ? (
                    <div className="rounded-2xl border border-[#cf4637] bg-[#3a1718]/85 px-4 py-3 text-sm text-[#ffb7ae]">
                      {error}
                    </div>
                  ) : null}
                </form>

                <div className="mt-4 text-center">
                  <p className="text-sm text-white/40 sm:text-base">Need the owner workspace?</p>
                  <Link href="/login" className="mt-1.5 inline-flex items-center justify-center gap-2 text-lg font-semibold text-[#f5be4e] transition hover:text-[#ffd983] sm:text-xl">
                    Open Owner Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <div className="text-sm font-semibold text-[#f8f2ea]">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/32">{label}</div>
    </div>
  );
}
