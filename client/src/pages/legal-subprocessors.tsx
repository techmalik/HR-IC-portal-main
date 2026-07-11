import { Link } from "wouter";
import { usePageMeta } from "@/lib/use-page-meta";
import { LegalPageLayout } from "@/components/legal-page-layout";

export default function SubprocessorsPage() {
  usePageMeta({
    title: "Subprocessors — Axle",
    description: "Third-party service providers Axle uses to process data.",
    canonical: "https://axlehq.app/subprocessors",
  });

  return (
    <LegalPageLayout title="Subprocessors" updated="July 11, 2026">
      <p>
        NorthPoint Technologies Ltd ("NorthPoint", "Axle") uses the
        third-party service providers below ("subprocessors") to help
        deliver Axle. Each processes personal data only as needed to provide
        its service to us, under contractual confidentiality and security
        obligations. This list is referenced by our{" "}
        <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/dpa">Data Processing Addendum</Link>.
      </p>

      <h2>Current subprocessors</h2>
      <ul>
        <li>
          <strong>Paystack</strong> — payment processing, subscription
          billing, and contractor payouts.
        </li>
        <li>
          <strong>Resend</strong> — transactional email delivery
          (notifications, invoices, account emails).
        </li>
        <li>
          <strong>Replit Object Storage</strong> — storage for uploaded
          files such as invoice attachments, receipts, and avatars.
        </li>
      </ul>
      <p>
        Data processed by these providers may be hosted outside the country
        where you or your organization are located.
      </p>

      <h2>Changes to this list</h2>
      <p>
        We may add or replace subprocessors as Axle evolves. We'll update
        this page when we do, and for organizations covered by our{" "}
        <Link href="/dpa">Data Processing Addendum</Link>, we'll give
        reasonable advance notice before a new subprocessor begins processing
        your data, so you can raise an objection.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>
    </LegalPageLayout>
  );
}
