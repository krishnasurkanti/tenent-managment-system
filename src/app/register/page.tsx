import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#090912] px-4 text-white">
      <div className="w-full max-w-sm rounded-[18px] border border-white/10 bg-[rgba(18,22,38,0.95)] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Access restricted</p>
        <h1 className="mt-2 text-xl font-bold text-white">Invite only</h1>
        <p className="mt-2 text-sm text-white/50">
          New accounts are created by invitation only. Contact the platform administrator to receive an invite link.
        </p>
        <Link
          href="/owner/login"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white"
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
