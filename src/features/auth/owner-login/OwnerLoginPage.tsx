"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form/text-input";
import { loginDemoOwner, loginOwner } from "@/services/auth/auth.service";

const featurePoints = ["Real-time alerts", "Smart rent tracking", "Simple control"];

type ServerStatus = "unknown" | "ready" | "offline";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [serverStatus, setServerStatus] = useState<ServerStatus>("unknown");
  const [wakingUp, setWakingUp] = useState(false);
  const pendingCredsRef = useRef<{ identifier: string; password: string } | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/keep-alive", { cache: "no-store" })
      .then((r) => { if (!cancelled) setServerStatus(r.ok ? "ready" : "offline"); })
      .catch(() => { if (!cancelled) setServerStatus("offline"); });
    return () => { cancelled = true; };
  }, []);

  const doLogin = useCallback(async (creds: { identifier: string; password: string }) => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await loginOwner({ phoneNumber: creds.identifier, email: creds.identifier, password: creds.password });
      if (!response.ok) {
        setWakingUp(false);
        pendingCredsRef.current = null;
        setError(data.message ?? "Unable to sign in.");
        return;
      }
      router.replace("/owner/dashboard");
      router.refresh();
    } catch {
      if (!wakingUp) setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, wakingUp]);

  useEffect(() => {
    if (!wakingUp) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    pollTimerRef.current = setInterval(() => {
      fetch("/api/keep-alive", { cache: "no-store" })
        .then((r) => {
          if (r.ok) {
            setServerStatus("ready");
            setWakingUp(false);
            if (pendingCredsRef.current) {
              const creds = pendingCredsRef.current;
              pendingCredsRef.current = null;
              void doLogin(creds);
            }
          }
        })
        .catch(() => { /* still offline, keep polling */ });
    }, 3000);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [wakingUp, doLogin]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || demoLoading) return;

    const missingFields = [!identifier.trim() ? "email" : null, !password.trim() ? "password" : null].filter(Boolean);
    if (missingFields.length > 0) {
      setError(`Enter ${missingFields.join(" and ")} before logging in.`);
      return;
    }

    if (serverStatus === "offline") {
      pendingCredsRef.current = { identifier, password };
      setWakingUp(true);
      return;
    }

    await doLogin({ identifier, password });
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

  const busy = loading || demoLoading;

  return (
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-primary)]/85 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Brand />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1100px] px-4 py-3 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 lg:grid lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-10 lg:py-10">
        {/* Desktop marketing column */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">HostelHub</p>
          <h1 className="font-display text-[clamp(1.5rem,4vw,2rem)] font-bold leading-tight text-[color:var(--fg-primary)]">
            Manage tenants.<br />
            <span className="text-[color:var(--accent)]">Never miss rent.</span>
          </h1>
          <div className="mt-4 flex flex-col gap-3">
            {featurePoints.map((point) => (
              <div key={point} className="flex items-center gap-3 text-base text-[color:var(--fg-secondary)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
                  <Check className="h-4 w-4" />
                </span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="mx-auto w-[min(calc(100vw-2rem),440px)] lg:mx-0 lg:w-full lg:max-w-[440px]">
          <div className="relative rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-4 shadow-[var(--shadow-4)] backdrop-blur-xl">
            {wakingUp ? <WakingUpOverlay /> : null}

            <div className="mb-5 lg:hidden"><Brand /></div>

            <h2 className="font-display text-[1.55rem] font-bold tracking-[-0.02em] text-[color:var(--fg-primary)] sm:text-[1.9rem]">Welcome back</h2>
            <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Login to your account</p>

            <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-3">
              <TextInput
                type="text"
                inputMode="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={busy}
                placeholder="Email or phone"
                autoComplete="username"
                leadingIcon={<Mail size={16} />}
              />
              <TextInput
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                placeholder="Password"
                autoComplete="current-password"
                leadingIcon={<Lock size={16} />}
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={busy}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {error ? (
                <div role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-2.5 pt-1">
                <Button type="submit" fullWidth disabled={busy} loading={loading} className="min-h-[50px] text-base">
                  {loading ? "Signing in…" : <>Login <ArrowRight size={16} /></>}
                </Button>
                <Button type="button" variant="secondary" fullWidth disabled={busy} onClick={handleDemoLogin}>
                  {demoLoading ? "Opening demo…" : "Try Demo Workspace"}
                </Button>
              </div>
            </form>

            <div className="mt-4 border-t border-[color:var(--border)] pt-3 text-center">
              <p className="text-xs text-[color:var(--fg-tertiary)]">
                First time?{" "}
                <Link href="/owner/signup?key=local-setup" className="font-semibold text-[color:var(--accent)] hover:brightness-110">Create your account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin back-door — unlinked, blends into background */}
      <div className="pb-4 text-center">
        <Link href="/super-admin/login" className="text-[11px] text-[color:var(--fg-tertiary)]/40 transition-colors hover:text-[color:var(--fg-tertiary)]" tabIndex={-1}>
          Admin access
        </Link>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-none text-[color:var(--fg-primary)]">HostelHub</p>
        <p className="mt-0.5 text-[11px] leading-none text-[color:var(--fg-tertiary)]">Tenant Management</p>
      </div>
    </div>
  );
}

function WakingUpOverlay() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] bg-[rgba(9,9,18,0.92)] px-6 text-center backdrop-blur-sm">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--brand-soft)]" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
          <Building2 className="h-7 w-7" />
        </div>
      </div>

      <div>
        <p className="text-base font-bold text-[color:var(--fg-primary)]">Server is waking up…</p>
        <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">
          {elapsed < 20 ? "Usually takes 15–20 seconds on first visit." : "Taking a bit longer than usual, almost there…"}
        </p>
      </div>

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--accent)]" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>

      <p className="text-[11px] text-[color:var(--fg-tertiary)]">{elapsed}s</p>
      <p className="text-[12px] text-[color:var(--fg-secondary)]">Logging in automatically once ready — no action needed.</p>
    </div>
  );
}
