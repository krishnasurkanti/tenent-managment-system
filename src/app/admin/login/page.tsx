"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Unable to sign in.");
        return;
      }

      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f172a_0%,#111827_58%,#0b1120_100%)]" />
      <div className="relative z-10 flex min-h-screen flex-col px-6 py-6">
        <div className="flex justify-end">
          <Link
            href="/login"
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-white/20"
          >
            Owner Login
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md text-white">
            <div className="mb-8 text-center">
              <div className="mx-auto flex w-fit items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-md">
                <Shield className="h-5 w-5 text-cyan-300" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">Admin Portal</span>
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight">Administrator Sign In</h1>
              <p className="mt-2 text-sm text-slate-300">Separate access for platform administration.</p>
            </div>

            <form
              onSubmit={handleLogin}
              className="rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_100%)] p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="space-y-4">
                <label className="block">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading}
                      placeholder="Admin email"
                      className="w-full rounded-2xl border border-white/25 bg-white/95 px-4 py-4 pl-12 text-base text-slate-700 outline-none transition focus:border-cyan-300"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      placeholder="Admin password"
                      className="w-full rounded-2xl border border-white/25 bg-white/95 px-4 py-4 pl-12 text-base text-slate-700 outline-none transition focus:border-cyan-300"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)] px-4 py-4 text-lg font-semibold text-white shadow-[0_18px_34px_rgba(14,165,233,0.25)] transition hover:opacity-95"
                >
                  {loading ? "Checking..." : "Admin Login"}
                </button>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
