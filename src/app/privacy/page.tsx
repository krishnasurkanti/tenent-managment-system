import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — StayManager",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What we collect",
    body: "We collect information you provide directly: name, email address, phone number, and account credentials. We also collect hostel and tenant data you enter while using StayManager. Usage data (page visits, feature usage) may be collected to improve the product.",
  },
  {
    title: "How we use it",
    body: "Your data is used to provide the StayManager service: authenticating your account, storing your hostel and tenant records, and sending transactional emails (billing summaries, password resets). We do not sell your data to third parties.",
  },
  {
    title: "Data storage and security",
    body: "Data is stored on cloud infrastructure (Supabase / Render). We use HTTPS for all data in transit, and passwords are hashed with bcrypt before storage. We take reasonable technical measures to protect your data but cannot guarantee absolute security.",
  },
  {
    title: "Data retention",
    body: "We retain your account data for as long as your account is active. When you delete your account, your personal data is marked for deletion and will be removed from live systems within 30 days. Backups are retained for up to 30 days thereafter.",
  },
  {
    title: "Your rights",
    body: (
      <>
        Depending on your location, you may have the right to access, correct, export, or delete your personal data. To exercise these rights, contact us at the email below. Users in the EU (GDPR), India (DPDP), and California (CCPA) have specific rights under applicable law.
        <ul className="mt-2 flex list-inside list-disc flex-col gap-1 text-[color:var(--fg-tertiary)]">
          <li>Right to access your data</li>
          <li>Right to correct inaccurate data</li>
          <li>Right to delete your account and data</li>
          <li>Right to data portability</li>
        </ul>
      </>
    ),
  },
  {
    title: "Cookies",
    body: "We use session cookies strictly necessary for authentication (access_token, refresh_token). No third-party tracking or advertising cookies are used.",
  },
  {
    title: "Changes",
    body: "We may update this policy. We will notify you by email or in-app notice when material changes are made. Continued use after notice constitutes acceptance.",
  },
  {
    title: "Contact",
    body: (
      <>
        Questions or requests regarding your data:{" "}
        <a href="mailto:surkanti1703@gmail.com" className="font-medium text-[color:var(--accent)] hover:brightness-110">surkanti1703@gmail.com</a>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] px-6 py-16 text-[color:var(--fg-primary)]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
          <ArrowLeft size={15} /> Back
        </Link>

        <h1 className="font-display text-3xl font-bold text-[color:var(--fg-primary)]">Privacy Policy</h1>
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
          <Link href="/terms" className="hover:text-[color:var(--fg-primary)]">Terms of Service</Link>
        </div>
      </div>
    </main>
  );
}
