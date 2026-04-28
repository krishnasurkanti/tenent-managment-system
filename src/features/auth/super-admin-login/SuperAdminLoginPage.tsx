"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, ServerCog, User } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await csrfFetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Invalid credentials.");
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
    <main className="relative min-h-dvh bg-[#090912] text-white">
      {/* Dot grid */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:18px_18px] opacity-80" />

      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-end gap-3 border-b border-white/8 bg-[rgba(9,9,11,0.88)] px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <a
          href="/owner/login"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#f2bb4d]/55 bg-[#1d1a19]/80 px-3.5 py-2 text-xs font-semibold text-[#ffd26a]"
        >
          <User className="h-4 w-4" />
          Owner Login
        </a>
      </header>

      {/* Centered card */}
      <div className="relative z-10 flex min-h-[calc(100dvh-52px)] items-center justify-center px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        <div className="w-full max-w-[min(100%,420px)]">
          <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a] shadow-[0_12px_28px_rgba(245,177,52,0.22)]">
                <ServerCog className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-[#f6f0e8]">Super Admin</p>
                <p className="mt-0.5 text-xs leading-none text-[#f6c44f]">Control Panel</p>
              </div>
            </div>

            <div className="mt-5">
              <h1 className="text-[1.55rem] font-bold tracking-[-0.04em] text-[#f7f0e8]">Admin Login</h1>
              <p className="mt-1 text-sm text-white/38">Restricted access. Authorized personnel only.</p>
            </div>

            <form onSubmit={handleLogin} className="mt-5 space-y-3">
              <label className="block">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={loading}
                    placeholder="Username"
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
                    disabled={loading}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-10 pr-12 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={loading}
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

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-bold text-[#1b1207] shadow-[0_10px_24px_rgba(240,175,47,0.22)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Login"}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
