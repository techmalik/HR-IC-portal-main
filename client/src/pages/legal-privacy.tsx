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
    <LegalPageLayout title="Privacy Policy" updated="July 11, 2026">
      <p>
        Axle is a workforce-management platform for companies that engage
        independent contractors — timesheets, leave, invoicing, expenses,
        overtime approval, and performance evaluations. Axle is a product of{" "}
        <strong>NorthPoint Technologies Ltd</strong> ("NorthPoint", "Axle",
        "we", "us", "our"), a company incorporated in Nigeria. This policy
        explains what personal data we collect, why, how it's handled, and
        the choices you have.
      </p>
      <p>
        This policy applies to visitors of our marketing site and to users of
        the Axle application (independent contractors, supervisors, and
        organization administrators). See also our{" "}
        <Link href="/terms">Terms of Service</Link>,{" "}
        <Link href="/cookies">Cookie Policy</Link>, and{" "}
        <Link href="/subprocessors">Subprocessors</Link> list.
      </p>

      <h2>Controller and processor roles</h2>
      <p>
        If your organization uses Axle to manage you as a contractor,
        employee, or supervisor, your organization decides what data to put
        into Axle and controls it. In that relationship, your organization is
        the <strong>data controller</strong> and NorthPoint is a{" "}
        <strong>data processor</strong> acting on the organization's
        instructions — see our{" "}
        <Link href="/dpa">Data Processing Addendum</Link>. If you'd like to
        access, correct, or delete data your organization has stored about
        you, please contact your organization's administrator first; we'll
        assist them in fulfilling that request.
      </p>
      <p>
        For data we collect directly — such as marketing site visits, blog
        subscriptions, and the billing/account-holder relationship with the
        organization itself — NorthPoint is the controller.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account &amp; identity data:</strong> name, email address,
          role, and organization membership.
        </li>
        <li>
          <strong>Work-product data</strong> your organization stores in
          Axle: timesheets, invoices, expenses, leave/out-of-office requests,
          overtime records, and performance evaluations.
        </li>
        <li>
          <strong>Contractor payment details:</strong> where an organization
          pays contractors through Axle, this can include bank account
          identifiers (such as IBAN or SWIFT/BIC code) and billing address.
          We do not store full card numbers — card payments are handled
          directly by Paystack.
        </li>
        <li>
          <strong>Organization billing data:</strong> billing email, address,
          and tax/VAT identifiers.
        </li>
        <li>
          <strong>Usage and device data:</strong> login activity, feature
          usage, approximate location derived from IP address (used for
          currency/localization), browser and device type, and security logs
          (needed to detect abuse and secure accounts).
        </li>
        <li>
          <strong>Files you upload:</strong> invoice attachments, receipts,
          and profile avatars.
        </li>
        <li>
          <strong>Communications:</strong> support requests and other
          messages you send us.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use personal data to: provide and maintain the service you or your
        organization signed up for; process payments and payouts; send
        transactional and account notifications and, where you've opted in,
        product updates; authenticate users and secure accounts (rate
        limiting, audit logs, fraud prevention); provide customer support;
        and maintain and improve the reliability and functionality of Axle.
        We do not sell your personal data, and we do not use contractor
        payment data for advertising.
      </p>

      <h2>Legal basis for processing</h2>
      <p>
        Where applicable data protection law requires it, we process personal
        data because it's necessary to perform our contract with your
        organization (or, for account holders, with you), to comply with a
        legal obligation (e.g. tax and payment records), because you've given
        consent (e.g. optional marketing emails), or because we have a
        legitimate interest in operating, securing, and improving Axle that
        isn't outweighed by your privacy interests.
      </p>

      <h2>Data isolation</h2>
      <p>
        Each organization's data is logically isolated from every other
        organization. NorthPoint personnel access customer data only for
        support, billing, security, and legal-compliance purposes, on a
        least-privilege basis.
      </p>

      <h2>How we share data</h2>
      <p>
        We share personal data with the service providers ("subprocessors")
        that help us run Axle — currently payment processing, transactional
        email, and file storage. See the current list on our{" "}
        <Link href="/subprocessors">Subprocessors</Link> page. We require
        these providers to protect data under contractual confidentiality and
        security obligations and to use it only to provide services to us.
      </p>
      <p>
        We may also disclose data if required by law, to enforce our{" "}
        <Link href="/terms">Terms of Service</Link>, to protect the rights,
        property, or safety of NorthPoint, our customers, or others, or in
        connection with a merger, acquisition, or sale of assets (subject to
        this policy continuing to apply to the data transferred).
      </p>

      <h2>International data transfers</h2>
      <p>
        NorthPoint is based in Nigeria, and some of our subprocessors host or
        process data outside the country where you or your organization are
        located. Where we transfer personal data internationally, we take
        reasonable steps to ensure it receives an adequate level of
        protection, consistent with our contractual obligations to our
        subprocessors and applicable law.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain personal data for as long as your organization's account is
        active, plus a reasonable period afterward to comply with legal,
        tax, and accounting obligations, resolve disputes, and enforce our
        agreements. Organization administrators can request deletion of
        their organization's data on account closure, subject to those
        retention obligations.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard safeguards to protect personal data,
        including encryption of data in transit, access controls, and
        per-organization data isolation. No method of transmission or
        storage is completely secure, and we cannot guarantee absolute
        security.
      </p>

      <h2>Cookies</h2>
      <p>
        Axle uses strictly necessary cookies to keep you signed in and secure
        your session. We do not use third-party advertising or tracking
        cookies. See our <Link href="/cookies">Cookie Policy</Link> for
        details.
      </p>

      <h2>Children's privacy</h2>
      <p>
        Axle is a business tool and is not directed at, or knowingly used to
        collect data from, children. If you believe a child has provided us
        with personal data, contact us and we'll delete it.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your relationship with us and applicable law, you may
        have the right to request access to, correction of, deletion of, or a
        copy of your personal data, and to object to or restrict certain
        processing. To exercise these rights, contact{" "}
        <a href="mailto:support@axlehq.app">support@axlehq.app</a>. If your
        data was provided to us by an organization you work with, we may need
        to direct your request to that organization, as described above.
        Blog and marketing subscribers can unsubscribe at any time via the
        link in any email, or by contacting us.
      </p>

      <h2>Data breach notification</h2>
      <p>
        If we become aware of a security incident that compromises personal
        data we control, we will notify affected organizations and, where
        required by law, individuals and regulators, without undue delay.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as Axle evolves. If we make material
        changes, we'll notify account holders by email or in-app notice
        before the changes take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or how we handle your data:{" "}
        <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>
    </LegalPageLayout>
  );
}
