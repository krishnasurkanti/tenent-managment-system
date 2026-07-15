import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[color:var(--bg-primary)] px-4 text-[color:var(--fg-primary)]">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,22,38,0.95)_0%,rgba(12,14,26,0.98)_100%)] p-6 text-center shadow-[var(--shadow-4)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-tertiary)]">Access restricted</p>
        <h1 className="mt-2 text-xl font-bold text-[color:var(--fg-primary)]">Invite only</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">
          New accounts are created by invitation only. Contact the platform administrator to receive an invite link.
        </p>
        <Link
          href="/owner/login"
          className="mt-5 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-5 py-2.5 text-sm font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]"
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
