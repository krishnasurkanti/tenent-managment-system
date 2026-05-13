import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — StayManager",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <Link href="/" className="text-sm text-muted-foreground hover:underline mb-8 inline-block">
        ← Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: May 2025</p>

      <section className="space-y-8 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-2">1. What we collect</h2>
          <p>
            We collect information you provide directly: name, email address, phone number, and
            account credentials. We also collect hostel and tenant data you enter while using
            StayManager. Usage data (page visits, feature usage) may be collected to improve the
            product.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. How we use it</h2>
          <p>
            Your data is used to provide the StayManager service: authenticating your account,
            storing your hostel and tenant records, and sending transactional emails (billing
            summaries, password resets). We do not sell your data to third parties.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Data storage and security</h2>
          <p>
            Data is stored on cloud infrastructure (Supabase / Render). We use HTTPS for all
            data in transit, and passwords are hashed with bcrypt before storage. We take
            reasonable technical measures to protect your data but cannot guarantee absolute
            security.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Data retention</h2>
          <p>
            We retain your account data for as long as your account is active. When you delete
            your account, your personal data is marked for deletion and will be removed from live
            systems within 30 days. Backups are retained for up to 30 days thereafter.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. Your rights</h2>
          <p>
            Depending on your location, you may have the right to access, correct, export, or
            delete your personal data. To exercise these rights, contact us at the email below.
            Users in the EU (GDPR), India (DPDP), and California (CCPA) have specific rights
            under applicable law.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
            <li>Right to access your data</li>
            <li>Right to correct inaccurate data</li>
            <li>Right to delete your account and data</li>
            <li>Right to data portability</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. Cookies</h2>
          <p>
            We use session cookies strictly necessary for authentication (access_token,
            refresh_token). No third-party tracking or advertising cookies are used.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Changes</h2>
          <p>
            We may update this policy. We will notify you by email or in-app notice when
            material changes are made. Continued use after notice constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Contact</h2>
          <p>
            Questions or requests regarding your data:{" "}
            <a href="mailto:surkanti1703@gmail.com" className="underline hover:text-foreground">
              surkanti1703@gmail.com
            </a>
          </p>
        </div>
      </section>

      <div className="mt-12 pt-8 border-t text-sm text-muted-foreground flex gap-4">
        <Link href="/terms" className="hover:underline">Terms of Service</Link>
      </div>
    </main>
  );
}
