"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    const missingFields = [
      !identifier.trim() ? "username or email" : null,
      !password.trim() ? "password" : null,
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setError(`Enter ${missingFields.join(" and ")} before logging in.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: identifier,
          email: identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Unable to sign in.");
        return;
      }

      try {
        const hostelsResponse = await fetch("/api/owner-hostels", { cache: "no-store" });
        const hostelsData = await hostelsResponse.json();

        if (hostelsData.hostels?.length) {
          const defaultHostelId = hostelsData.hostels[0]?.id;

          if (defaultHostelId && typeof window !== "undefined") {
            window.localStorage.setItem("currentHostelId", defaultHostelId);
          }
        }
      } catch (_error) {
        // Keep login successful even if the hostel preload fails.
      }

      router.replace("/owner/dashboard");
      router.refresh();
    } catch (_error) {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(88,58,136,0.28),rgba(60,38,103,0.44))]" />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-6">
        <div className="flex justify-end">
          <Link
            href="/admin/login"
            className="rounded-full border border-white/40 bg-white/22 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-white/30 hover:text-white"
          >
            Admin Login
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md text-center text-white">
            <div className="mb-8">
              <div className="mx-auto flex w-fit items-center gap-3">
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 backdrop-blur-md">
                  <ShieldCheck className="h-8 w-8 text-pink-300" />
                </div>
                <div className="text-left">
                  <p className="text-5xl font-bold tracking-tight">
                    My<span className="text-pink-300">PG</span>
                  </p>
                </div>
              </div>
              <h1 className="mt-8 text-4xl font-semibold tracking-tight">Welcome to My PG</h1>
              <p className="mt-3 text-lg text-white/85">Login to your account</p>
            </div>

            <form onSubmit={handleLogin} className="rounded-[30px] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(245,238,255,0.92)_100%)] p-5 text-left shadow-2xl backdrop-blur-xl">
              <div className="space-y-4">
                <label className="block">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      disabled={loading}
                      placeholder="Username or email"
                      className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-4 pl-12 text-base text-slate-700 outline-none transition focus:border-violet-300"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      placeholder="Password"
                      className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-4 pl-12 text-base text-slate-700 outline-none transition focus:border-violet-300"
                    />
                  </div>
                </label>

                <div className="flex items-center justify-between px-1 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" disabled={loading} className="h-4 w-4 rounded border-slate-300" />
                    <span>Remember Me</span>
                  </label>
                  <button type="button" className="font-medium text-violet-600 hover:text-violet-700">
                    Forgot Password?
                  </button>
                </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] px-4 py-4 text-lg font-semibold text-white shadow-[var(--shadow-soft)] transition hover:text-white hover:opacity-95"
                  >
                    {loading ? "Checking..." : "Login"}
                  </button>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
              </div>
            </form>

            <p className="mt-8 text-base text-white/90">
              Don&apos;t have an account?{" "}
                <button type="button" className="font-semibold text-pink-100 hover:text-white">
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
