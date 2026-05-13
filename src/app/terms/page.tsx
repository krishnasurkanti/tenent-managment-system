import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — StayManager",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <Link href="/" className="text-sm text-muted-foreground hover:underline mb-8 inline-block">
        ← Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: May 2025</p>

      <section className="space-y-8 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-2">1. Acceptance</h2>
          <p>
            By creating an account or using StayManager, you agree to these Terms of Service.
            If you do not agree, do not use the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Description of service</h2>
          <p>
            StayManager is a hostel and tenant management platform for property owners. Features
            include hostel setup, tenant records, room allocation, billing, and payments.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Account responsibilities</h2>
          <p>
            You are responsible for maintaining the security of your account credentials. You
            must not share your password or allow others to access your account. You are
            responsible for all activity that occurs under your account.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
            <li>Use the service for any unlawful purpose</li>
            <li>Store false, misleading, or fraudulent tenant information</li>
            <li>Attempt to gain unauthorised access to other accounts or systems</li>
            <li>Reverse-engineer or copy the service</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. Your data</h2>
          <p>
            You own the tenant and hostel data you enter. By using the service you grant us a
            limited licence to store and process that data solely to provide the service. See our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            for full details.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. Payments and billing</h2>
          <p>
            Paid plans are billed monthly. You authorise us to charge your chosen payment method
            on the billing date. Refunds are handled on a case-by-case basis — contact support
            within 7 days of a charge you believe is incorrect.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Availability</h2>
          <p>
            We aim for high availability but do not guarantee uninterrupted service. We may
            perform maintenance that temporarily makes the service unavailable. We are not liable
            for losses caused by downtime.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Termination</h2>
          <p>
            You may delete your account at any time via account settings. We may suspend or
            terminate accounts that violate these terms. Upon termination, your data will be
            deleted in accordance with our Privacy Policy.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">9. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, StayManager is provided "as is" without
            warranties. We are not liable for indirect, incidental, or consequential damages
            arising from your use of the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">10. Governing law</h2>
          <p>
            These terms are governed by the laws of India. Disputes will be resolved in the
            courts of Telangana, India.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">11. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a href="mailto:surkanti1703@gmail.com" className="underline hover:text-foreground">
              surkanti1703@gmail.com
            </a>
          </p>
        </div>
      </section>

      <div className="mt-12 pt-8 border-t text-sm text-muted-foreground flex gap-4">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
      </div>
    </main>
  );
}
