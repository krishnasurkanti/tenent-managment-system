"use client";

import { AtomicBadge } from "@/components/ui/atomic-badge";
import { AtomicButton } from "@/components/ui/atomic-button";
import { AtomicCard } from "@/components/ui/atomic-card";
import { AtomicInput } from "@/components/ui/atomic-input";

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg-primary)] px-4 py-12 text-[color:var(--fg-primary)] sm:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="rounded-[10px] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-primary)_100%)] p-8 shadow-[0_28px_70px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--brand)]">Atomic Design System</p>
          <h1 className="mt-4 text-token-5xl text-[color:var(--fg-primary)]">Dark-mode component primitives</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--fg-secondary)]">
            Built on a 4px spacing grid with reusable buttons, input states, badges, and a card pattern.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
            <p className="text-token-2xl text-[color:var(--fg-primary)]">Spacing Tokens</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["--space-1", "4px"],
                ["--space-2", "8px"],
                ["--space-3", "12px"],
                ["--space-4", "16px"],
                ["--space-6", "24px"],
                ["--space-8", "32px"],
                ["--space-12", "48px"],
                ["--space-16", "64px"],
              ].map(([token, value]) => (
                <div key={token} className="rounded-[16px] border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{token}</p>
                  <p className="mt-2 text-sm text-[color:var(--fg-primary)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
            <p className="text-token-2xl text-[color:var(--fg-primary)]">Badges</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <AtomicBadge variant="new">New</AtomicBadge>
              <AtomicBadge variant="active">Active</AtomicBadge>
              <AtomicBadge variant="pending">Pending</AtomicBadge>
              <AtomicBadge variant="error">Error</AtomicBadge>
            </div>
          </div>
        </section>

        <section className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
          <p className="text-token-2xl text-[color:var(--fg-primary)]">Buttons</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <AtomicButton variant="primary" size="small">Primary S</AtomicButton>
            <AtomicButton variant="primary" size="medium">Primary M</AtomicButton>
            <AtomicButton variant="primary" size="large">Primary L</AtomicButton>
            <AtomicButton variant="secondary" size="medium">Secondary</AtomicButton>
            <AtomicButton variant="ghost" size="medium">Ghost</AtomicButton>
            <AtomicButton variant="danger" size="medium">Destructive</AtomicButton>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
            <p className="text-token-2xl text-[color:var(--fg-primary)]">Input States</p>
            <div className="mt-5 space-y-4">
              <AtomicInput />
              <AtomicInput focused />
              <AtomicInput disabled />
              <AtomicInput requiredMessage="Required field" />
            </div>
          </div>

          <div className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
            <p className="text-token-2xl text-[color:var(--fg-primary)]">Card</p>
            <div className="mt-5">
              <AtomicCard />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
