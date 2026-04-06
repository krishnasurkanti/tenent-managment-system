import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <Card className="max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">The page you requested is not available in the current hostel owner workspace.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Back to login
        </Link>
      </Card>
    </main>
  );
}
