"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, ServerCog, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form/text-input";
import { loginAdmin } from "@/services/auth/auth.service";

const adminPoints = ["Billing and hostel oversight", "Owner access review", "Platform-wide monitoring"];

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
      const { response, data } = await loginAdmin({ phoneNumber: identifier, email: identifier, password });
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
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-end gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-primary)]/85 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <Link href="/owner/login" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3.5 py-2 text-xs font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
          <Shield className="h-4 w-4" /> Owner Login
        </Link>
      </header>

      <div className="mx-auto w-full max-w-[1100px] px-4 py-3 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 lg:grid lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-10 lg:py-10">
        {/* Desktop marketing column */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
                <ServerCog className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none text-[color:var(--fg-primary)]">Platform</p>
                <p className="text-xl font-bold leading-none text-[color:var(--accent)]">Admin Console</p>
              </div>
            </div>

            <h1 className="font-display mt-4 text-[clamp(1.5rem,4vw,2rem)] font-bold leading-tight text-[color:var(--fg-primary)]">
              Control billing.
              <span className="mt-1.5 block text-[color:var(--accent)]">Review every hostel.</span>
            </h1>

            <div className="mt-4 flex flex-col gap-3">
              {adminPoints.map((point) => (
                <div key={point} className="flex items-center gap-3 text-base text-[color:var(--fg-secondary)]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="mx-auto w-[min(calc(100vw-2rem),440px)] lg:mx-0 lg:w-full lg:max-w-[440px]">
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-4 shadow-[var(--shadow-4)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2.5 lg:hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
                <ServerCog className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-[color:var(--fg-primary)]">Platform</p>
                <p className="text-sm font-bold leading-none text-[color:var(--accent)]">Admin Console</p>
              </div>
            </div>

            <h2 className="font-display text-[1.55rem] font-bold tracking-[-0.02em] text-[color:var(--fg-primary)] sm:text-[1.9rem]">Welcome back</h2>
            <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Login to your admin account</p>

            <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-3">
              <TextInput type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} disabled={loading} placeholder="Email or username" leadingIcon={<Mail size={16} />} />
              <TextInput
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Password"
                leadingIcon={<Lock size={16} />}
                trailingIcon={
                  <button type="button" onClick={() => setShowPassword((s) => !s)} disabled={loading} aria-label={showPassword ? "Hide password" : "Show password"} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {error ? (
                <div role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">{error}</div>
              ) : null}

              <div className="pt-1">
                <Button type="submit" fullWidth disabled={loading} loading={loading} className="min-h-[50px] text-base">
                  {loading ? "Checking…" : <>Login <ArrowRight size={16} /></>}
                </Button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-[color:var(--fg-secondary)]">Need the owner workspace?</p>
              <Link href="/owner/login" className="mt-1.5 inline-flex items-center justify-center gap-1 text-lg font-bold text-[color:var(--accent)] transition hover:brightness-110">
                Open Owner Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
