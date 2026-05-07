import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getOwnerSession } from "@/lib/session-mode";

export default async function NotFound() {
  const session = await getOwnerSession();
  const href = session.mode !== "guest" ? "/owner/dashboard" : "/owner/login";
  const label = session.mode !== "guest" ? "Back to dashboard" : "Back to login";

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <Card className="max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          The page you requested is not available.
        </p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[color:var(--cta-strong)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {label}
        </Link>
      </Card>
    </main>
  );
}
