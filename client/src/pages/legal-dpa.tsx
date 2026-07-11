import { Link } from "wouter";
import { usePageMeta } from "@/lib/use-page-meta";
import { LegalPageLayout } from "@/components/legal-page-layout";

export default function DataProcessingAddendumPage() {
  usePageMeta({
    title: "Data Processing Addendum — Axle",
    description: "Terms governing NorthPoint's processing of personal data on behalf of Axle customers.",
    canonical: "https://axlehq.app/dpa",
  });

  return (
    <LegalPageLayout title="Data Processing Addendum" updated="July 11, 2026">
      <p>
        This Data Processing Addendum ("DPA") forms part of the{" "}
        <Link href="/terms">Terms of Service</Link> between your organization
        ("Customer") and NorthPoint Technologies Ltd ("NorthPoint"), and
        applies where NorthPoint processes personal data on Customer's behalf
        through Axle. It reflects, rather than replaces, the Terms — in a
        conflict between this DPA and the Terms on data-protection matters,
        this DPA controls.
      </p>

      <h2>Roles</h2>
      <p>
        For personal data Customer submits or causes to be submitted to Axle
        about its contractors, employees, or supervisors ("Customer
        Personal Data"), Customer is the data controller and NorthPoint is
        the data processor, processing Customer Personal Data only on
        Customer's documented instructions (including as set out in the
        Terms and Customer's configuration and use of Axle).
      </p>

      <h2>Subject matter, duration, and purpose</h2>
      <p>
        NorthPoint processes Customer Personal Data for the duration of the
        underlying subscription, for the purpose of providing the Axle
        workforce-management platform, including timesheets, leave,
        invoicing, expense, overtime, and evaluation workflows.
      </p>

      <h2>Categories of data subjects and data</h2>
      <p>
        Data subjects: Customer's contractors, employees, and supervisors who
        use Axle. Categories of data: identity and contact data (name,
        email, role), work-product data (timesheets, invoices, expenses,
        leave records, evaluations), and, where applicable, contractor
        payment details (such as bank account identifiers and billing
        address).
      </p>

      <h2>NorthPoint's obligations</h2>
      <ul>
        <li>Process Customer Personal Data only on Customer's instructions, unless required otherwise by law;</li>
        <li>Ensure personnel with access are bound by confidentiality obligations;</li>
        <li>Implement appropriate technical and organizational security measures, including encryption in transit and per-organization data isolation;</li>
        <li>Engage subprocessors only as disclosed in our <Link href="/subprocessors">Subprocessors</Link> list, and remain responsible for their performance;</li>
        <li>Assist Customer, at Customer's reasonable request, in responding to data subject requests and in meeting Customer's own data protection obligations relating to Axle;</li>
        <li>Notify Customer without undue delay after becoming aware of a personal data breach affecting Customer Personal Data;</li>
        <li>At Customer's choice, delete or return Customer Personal Data at the end of the engagement, subject to legal retention requirements, consistent with the Terms;</li>
        <li>Make available information reasonably necessary to demonstrate compliance with this DPA.</li>
      </ul>

      <h2>Subprocessors</h2>
      <p>
        Customer authorizes NorthPoint to engage the subprocessors listed on
        our <Link href="/subprocessors">Subprocessors</Link> page. We'll give
        reasonable advance notice of new subprocessors so Customer can object
        on reasonable data-protection grounds; if unresolved, Customer's sole
        remedy is to terminate the affected service.
      </p>

      <h2>International transfers</h2>
      <p>
        Where Customer Personal Data is transferred outside the country
        where the data subject is located, NorthPoint will take reasonable
        steps to ensure it receives an adequate level of protection,
        consistent with the international transfer commitments in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        Each party's liability arising out of this DPA is subject to the
        limitation of liability set out in the Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this DPA, or to request an executed copy for your
        records: <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>
    </LegalPageLayout>
  );
}
