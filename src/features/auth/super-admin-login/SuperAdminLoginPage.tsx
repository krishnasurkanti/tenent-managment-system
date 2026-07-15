"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, ServerCog, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form/text-input";
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
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      <header className="sticky top-0 z-50 flex min-h-[52px] items-center justify-end gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-primary)]/85 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <a href="/owner/login" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3.5 py-2 text-xs font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
          <User className="h-4 w-4" /> Owner Login
        </a>
      </header>

      <div className="flex min-h-[calc(100dvh-52px)] items-center justify-center py-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="w-[min(calc(100vw-2rem),420px)]">
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-4 shadow-[var(--shadow-4)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
                <ServerCog className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-[color:var(--fg-primary)]">Super Admin</p>
                <p className="mt-0.5 text-xs leading-none text-[color:var(--accent)]">Control Panel</p>
              </div>
            </div>

            <div className="mt-5">
              <h1 className="font-display text-[1.55rem] font-bold tracking-[-0.02em] text-[color:var(--fg-primary)]">Admin login</h1>
              <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Restricted access. Authorized personnel only.</p>
            </div>

            <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-3">
              <TextInput type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} placeholder="Username" autoComplete="username" leadingIcon={<User size={16} />} />
              <TextInput
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Password"
                autoComplete="current-password"
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
                  {loading ? "Verifying…" : <>Login <ArrowRight size={16} /></>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
