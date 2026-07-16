import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — StayManager",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  { title: "Acceptance", body: "By creating an account or using StayManager, you agree to these Terms of Service. If you do not agree, do not use the service." },
  { title: "Description of service", body: "StayManager is a hostel and tenant management platform for property owners. Features include hostel setup, tenant records, room allocation, billing, and payments." },
  { title: "Account responsibilities", body: "You are responsible for maintaining the security of your account credentials. You must not share your password or allow others to access your account. You are responsible for all activity that occurs under your account." },
  {
    title: "Acceptable use",
    body: (
      <>
        You agree not to:
        <ul className="mt-2 flex list-inside list-disc flex-col gap-1 text-[color:var(--fg-tertiary)]">
          <li>Use the service for any unlawful purpose</li>
          <li>Store false, misleading, or fraudulent tenant information</li>
          <li>Attempt to gain unauthorised access to other accounts or systems</li>
          <li>Reverse-engineer or copy the service</li>
        </ul>
      </>
    ),
  },
  {
    title: "Your data",
    body: (
      <>
        You own the tenant and hostel data you enter. By using the service you grant us a limited licence to store and process that data solely to provide the service. See our{" "}
        <Link href="/privacy" className="font-medium text-[color:var(--accent)] hover:brightness-110">Privacy Policy</Link>{" "}for full details.
      </>
    ),
  },
  { title: "Payments and billing", body: "Paid plans are billed monthly. You authorise us to charge your chosen payment method on the billing date. Refunds are handled on a case-by-case basis — contact support within 7 days of a charge you believe is incorrect." },
  { title: "Availability", body: "We aim for high availability but do not guarantee uninterrupted service. We may perform maintenance that temporarily makes the service unavailable. We are not liable for losses caused by downtime." },
  { title: "Termination", body: "You may delete your account at any time via account settings. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted in accordance with our Privacy Policy." },
  { title: "Limitation of liability", body: "To the maximum extent permitted by law, StayManager is provided “as is” without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of the service." },
  { title: "Governing law", body: "These terms are governed by the laws of India. Disputes will be resolved in the courts of Telangana, India." },
  {
    title: "Contact",
    body: (
      <>
        Questions about these terms:{" "}
        <a href="mailto:surkanti1703@gmail.com" className="font-medium text-[color:var(--accent)] hover:brightness-110">surkanti1703@gmail.com</a>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] px-6 py-16 text-[color:var(--fg-primary)]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
          <ArrowLeft size={15} /> Back
        </Link>

        <h1 className="font-display text-3xl font-bold text-[color:var(--fg-primary)]">Terms of Service</h1>
        <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Last updated: May 2025</p>

        <section className="mt-10 flex flex-col gap-3">
          {SECTIONS.map((s, i) => (
            <div key={s.title} className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-5 shadow-[var(--shadow-1)]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-soft)] text-xs font-bold text-[color:var(--accent)]">{i + 1}</span>
                <h2 className="text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">{s.title}</h2>
              </div>
              <div className="mt-2.5 text-sm leading-relaxed text-[color:var(--fg-secondary)]">{s.body}</div>
            </div>
          ))}
        </section>

        <div className="mt-12 flex gap-4 border-t border-[color:var(--border)] pt-8 text-sm text-[color:var(--fg-secondary)]">
          <Link href="/privacy" className="hover:text-[color:var(--fg-primary)]">Privacy Policy</Link>
        </div>
      </div>
    </main>
  );
}
