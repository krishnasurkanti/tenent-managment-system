"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/owner-hostels", { cache: "no-store" });
      const data = await response.json();

      if (data.hostels?.length) {
        const defaultHostelId = data.hostels[0]?.id;

        if (defaultHostelId && typeof window !== "undefined") {
          window.localStorage.setItem("currentHostelId", defaultHostelId);
        }

        router.push("/owner/dashboard");
        return;
      }

      router.push("/owner/create-hostel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,18,16,0.28),rgba(30,24,20,0.48))]" />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-6">
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-full border border-white/30 bg-white/18 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/24"
          >
            Owner Access
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md text-center text-white">
            <div className="mb-8">
              <div className="mx-auto flex w-fit items-center gap-3">
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 backdrop-blur-md">
                  <ShieldCheck className="h-8 w-8 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="text-5xl font-bold tracking-tight">
                    My<span className="text-orange-400">PG</span>
                  </p>
                </div>
              </div>
              <h1 className="mt-8 text-4xl font-semibold tracking-tight">Welcome to My PG</h1>
              <p className="mt-3 text-lg text-white/85">Login to your account</p>
            </div>

            <div className="rounded-[28px] border border-white/35 bg-white/85 p-5 text-left shadow-2xl backdrop-blur-xl">
              <div className="space-y-4">
                <label className="block">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Username or Email"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 pl-12 text-base text-slate-700 outline-none transition focus:border-orange-300"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Password"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 pl-12 text-base text-slate-700 outline-none transition focus:border-orange-300"
                    />
                  </div>
                </label>

                <div className="flex items-center justify-between px-1 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    <span>Remember Me</span>
                  </label>
                  <button type="button" className="font-medium text-orange-500 hover:text-orange-600">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-4 text-lg font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-600"
                >
                  {loading ? "Checking..." : "Login"}
                </button>

                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-700">
                  Demo mode is active. You can enter any username or email and any password to open the hostel owner flow.
                </div>
              </div>
            </div>

            <p className="mt-8 text-base text-white/90">
              Don&apos;t have an account?{" "}
              <button type="button" className="font-semibold text-orange-300 hover:text-orange-200">
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
