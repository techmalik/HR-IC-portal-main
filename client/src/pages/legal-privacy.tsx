import { Link } from "wouter";
import { usePageMeta } from "@/lib/use-page-meta";
import { LegalPageLayout } from "@/components/legal-page-layout";

export default function PrivacyPolicyPage() {
  usePageMeta({
    title: "Privacy Policy — Axle",
    description: "How Axle collects, uses, and protects your data.",
    canonical: "https://axlehq.app/privacy",
  });

  return (
    <LegalPageLayout title="Privacy Policy" updated="July 9, 2026">
      <p>
        Axle ("we", "us", "our") provides a platform for managing independent
        contractors — timesheets, invoices, evaluations, and related
        workflows. This policy explains what data we collect, why, and how
        it's handled.
      </p>

      <h2>Data we collect</h2>
      <p>
        Account data (name, email, role), work-product data your organization
        stores in Axle (timesheets, invoices, evaluations, out-of-office
        requests), and usage data (login activity, feature usage) needed to
        operate and secure the product. Billing is handled by Paystack; we do
        not store full card numbers.
      </p>

      <h2>How we use it</h2>
      <p>
        To provide the service you signed up for, to send transactional and
        notification emails you've opted into, to secure accounts (rate
        limiting, audit logs), and to improve the product. We do not sell
        your data.
      </p>

      <h2>Data isolation</h2>
      <p>
        Each organization's data is isolated from every other organization.
        Platform administrators have access only for support, billing, and
        security purposes.
      </p>

      <h2>Third parties</h2>
      <p>
        We use Paystack for payment processing and Resend for transactional
        email delivery. Each has its own privacy policy governing the data
        they process on our behalf.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request access to, correction of, or deletion of your
        personal data by contacting{" "}
        <a href="mailto:support@axlehq.app">support@axlehq.app</a>. Blog
        subscribers can unsubscribe at any time via the link in any email, or
        by contacting us.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>

      <p>
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPageLayout>
  );
}
