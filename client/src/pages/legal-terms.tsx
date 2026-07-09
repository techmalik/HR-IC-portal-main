import { Link } from "wouter";
import { usePageMeta } from "@/lib/use-page-meta";
import { LegalPageLayout } from "@/components/legal-page-layout";

export default function TermsOfServicePage() {
  usePageMeta({
    title: "Terms of Service — Axle",
    description: "The terms governing use of the Axle platform.",
    canonical: "https://axlehq.app/terms",
  });

  return (
    <LegalPageLayout title="Terms of Service" updated="July 9, 2026">
      <p>
        These terms govern your use of Axle. By creating an account or using
        Axle, you agree to them.
      </p>

      <h2>Accounts</h2>
      <p>
        You're responsible for the accuracy of information you provide and
        for activity under your account. Organization admins are responsible
        for the users they invite into their organization.
      </p>

      <h2>Subscriptions & billing</h2>
      <p>
        Paid plans are billed via Paystack on the cadence shown at checkout.
        New organizations get a 7-day free trial; access is suspended if the
        trial ends without an active subscription. You can cancel or change
        plans at any time from Billing settings; downgrades take effect at
        the end of the current billing period.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don't use Axle to store data you don't have the right to store,
        attempt to breach another organization's data, or interfere with the
        platform's operation.
      </p>

      <h2>Data ownership</h2>
      <p>
        You own the data your organization puts into Axle. We process it to
        provide the service, per our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        We aim for high availability but don't guarantee uninterrupted
        service. We'll make reasonable efforts to notify you of planned
        maintenance that affects availability.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using Axle and cancel your subscription at any time. We
        may suspend or terminate accounts that violate these terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the product evolves. Material changes
        will be communicated by email or in-app notice.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>
    </LegalPageLayout>
  );
}
