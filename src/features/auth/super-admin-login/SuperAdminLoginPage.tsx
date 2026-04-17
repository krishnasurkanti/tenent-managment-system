"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, ServerCog, User } from "lucide-react";

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
      const response = await fetch("/api/super-admin/login", {
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
    <main className="h-dvh overflow-y-auto overscroll-contain bg-[#090912] px-2 py-2 text-white sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-[8px] border border-white/10 bg-[radial-gradient(circle_at_18%_36%,rgba(57,77,160,0.22),transparent_24%),radial-gradient(circle_at_60%_75%,rgba(236,172,66,0.18),transparent_18%),linear-gradient(180deg,#0d0f1a_0%,#090b14_100%)] shadow-[0_36px_100px_rgba(0,0,0,0.42)] sm:min-h-[calc(100dvh-2rem)] lg:rounded-[10px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:14px_14px] opacity-20" />

        <div className="smart-scroll-header relative z-10 flex items-center justify-end border-b border-white/8 px-3 py-2.5 sm:px-5">
          <a
            href="/owner/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#f2bb4d]/55 bg-[#1d1a19]/80 px-3.5 py-2 text-xs font-semibold text-[#ffd26a]"
          >
            <User className="h-4 w-4" />
            Owner Login
          </a>
        </div>

        <section className="smart-scroll-area smart-scroll-fade relative flex items-center justify-center px-3 py-8">
          <div className="w-full max-w-md">
            <div className="rounded-[8px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,22,38,0.92)_0%,rgba(15,17,31,0.96)_100%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:rounded-[10px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a] shadow-[0_16px_36px_rgba(245,177,52,0.18)]">
                  <ServerCog className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none text-[#f6f0e8]">Super Admin</p>
                  <p className="text-sm font-semibold leading-none text-[#f6c44f]">Control Panel</p>
                </div>
              </div>

              <div className="mt-5 text-center">
                <h1 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-[#f7f0e8]">Admin Login</h1>
                <p className="mt-1 text-sm text-white/45">Restricted access. Authorized personnel only.</p>
              </div>

              <form onSubmit={handleLogin} className="mt-5 space-y-3">
                <label className="block">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      disabled={loading}
                      placeholder="Username"
                      autoComplete="username"
                      className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-11 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
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
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 pl-11 pr-12 text-sm text-[#f7f0e8] outline-none transition placeholder:text-white/28 focus:border-[#f2bb4d]/60 focus:bg-white/[0.05]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      disabled={loading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Login"}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>

                {error ? (
                  <div role="alert" className="rounded-2xl border border-[#cf4637] bg-[#3a1718]/85 px-4 py-3 text-sm text-[#ffb7ae]">
                    {error}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
