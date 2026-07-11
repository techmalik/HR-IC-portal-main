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
    <LegalPageLayout title="Terms of Service" updated="July 11, 2026">
      <p>
        Axle is operated by <strong>NorthPoint Technologies Ltd</strong>{" "}
        ("NorthPoint", "Axle", "we", "us", "our"), a company incorporated in
        Nigeria. These terms ("Terms") govern access to and use of Axle by
        the organization and individuals using it (each, "you" or
        "Customer"). By creating an account, accepting an invitation, or
        otherwise using Axle, you agree to these Terms. If you're accepting
        on behalf of an organization, you confirm you have authority to bind
        that organization.
      </p>

      <h2>Accounts</h2>
      <p>
        You're responsible for the accuracy of information you provide and
        for all activity under your account, including keeping your login
        credentials confidential. Organization administrators are
        responsible for the users they invite into their organization and
        for those users' compliance with these Terms.
      </p>

      <h2>Subscriptions &amp; billing</h2>
      <p>
        Paid plans are billed via Paystack on the cadence shown at checkout
        and renew automatically unless cancelled before the renewal date. New
        organizations get a 7-day free trial; access is suspended if the
        trial ends without an active subscription. Fees are exclusive of
        applicable taxes, which are your responsibility unless we're required
        by law to collect them. You can cancel or change plans at any time
        from Billing settings; downgrades take effect at the end of the
        current billing period. Except as required by law, fees are
        non-refundable. We may change our prices with at least 30 days'
        notice; continued use after a price change takes effect constitutes
        acceptance.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use Axle for any unlawful purpose, or to store or process data you
          don't have the right to store or process;
        </li>
        <li>
          Attempt to access another organization's data, or probe, scan, or
          test the vulnerability of the platform without our prior written
          authorization;
        </li>
        <li>
          Reverse engineer, decompile, or attempt to extract the source code
          of Axle, except where applicable law permits it despite this
          restriction;
        </li>
        <li>
          Resell, sublicense, or provide Axle to third parties as a
          standalone or bundled service without our prior written consent;
        </li>
        <li>
          Scrape, crawl, or use automated means to extract data from Axle
          outside of features we provide for that purpose;
        </li>
        <li>
          Upload malicious code, or interfere with or disrupt the integrity
          or performance of the platform or its infrastructure;
        </li>
        <li>
          Use Axle to harass, defame, or violate the legal rights of others.
        </li>
      </ul>
      <p>
        We may suspend access immediately, without prior notice, where we
        reasonably believe continued access poses a security risk, legal
        risk, or violates this section.
      </p>

      <h2>Worker classification is your responsibility</h2>
      <p>
        Axle is a workflow and record-keeping tool for organizations that
        engage independent contractors. Axle does not provide legal, tax, or
        employment advice, and nothing in Axle or these Terms should be
        interpreted as such. Whether a worker is correctly classified as an
        independent contractor (rather than an employee) under applicable
        labor, tax, or immigration law depends on facts specific to that
        relationship and jurisdiction. You, not NorthPoint, are solely
        responsible for determining the correct classification of workers
        you manage in Axle and for complying with all applicable laws
        governing that relationship, including tax withholding, benefits, and
        labor law obligations. NorthPoint disclaims all liability arising
        from worker misclassification or related compliance failures by you
        or your organization.
      </p>

      <h2>Your data</h2>
      <p>
        You own the data your organization puts into Axle ("Customer Data").
        You grant us a license to host, process, and display Customer Data
        solely to provide and support the service, as described in our{" "}
        <Link href="/privacy">Privacy Policy</Link> and, where applicable,
        our <Link href="/dpa">Data Processing Addendum</Link>. You represent
        that you have all necessary rights and consents to provide Customer
        Data to us, including any personal data of contractors or employees
        you manage in Axle.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Axle, including its software, design, and branding, is owned by
        NorthPoint and protected by intellectual property laws. Subject to
        these Terms and payment of applicable fees, we grant you a limited,
        non-exclusive, non-transferable license to access and use Axle for
        your internal business purposes. We reserve all rights not expressly
        granted.
      </p>

      <h2>Third-party services</h2>
      <p>
        Axle relies on third-party providers, including Paystack for payment
        processing and Resend for email delivery (see our{" "}
        <Link href="/subprocessors">Subprocessors</Link> page). Your use of
        payment features is also subject to Paystack's terms. We aren't
        responsible for the acts, omissions, or unavailability of third-party
        providers, though we'll work to minimize any disruption they cause.
      </p>

      <h2>Availability</h2>
      <p>
        We aim for high availability but don't guarantee uninterrupted or
        error-free service. We'll make reasonable efforts to notify you of
        planned maintenance that affects availability.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        Axle is provided "as is" and "as available," without warranties of
        any kind, whether express, implied, or statutory, including implied
        warranties of merchantability, fitness for a particular purpose,
        title, and non-infringement. We do not warrant that Axle will be
        uninterrupted, secure, or error-free, or that any data will be
        accurate or preserved without loss, to the maximum extent permitted
        by applicable law.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law: neither party will
        be liable for indirect, incidental, special, consequential, or
        punitive damages, or for lost profits, revenue, goodwill, or data,
        arising out of or related to these Terms or use of Axle, even if
        advised of the possibility of such damages. Each party's total
        liability arising out of or related to these Terms will not exceed
        the total fees paid or payable by Customer to NorthPoint in the 12
        months preceding the event giving rise to the claim. These
        limitations don't apply to a party's indemnification obligations
        below, a breach of the confidentiality obligations in these Terms, or
        liability that cannot be limited under applicable law.
      </p>

      <h2>Indemnification</h2>
      <p>
        You agree to indemnify and hold NorthPoint harmless from any claims,
        damages, and expenses (including reasonable legal fees) arising from:
        your use of Axle in violation of these Terms or applicable law; data
        you upload to Axle that you don't have the right to store or share;
        or a dispute between you and a contractor, employee, or other third
        party arising from your use of Axle, including disputes over worker
        classification. NorthPoint will indemnify you against third-party
        claims that Axle, as provided by us and used in accordance with
        these Terms, infringes that third party's intellectual property
        rights, subject to the liability cap above.
      </p>

      <h2>Confidentiality</h2>
      <p>
        Each party may access non-public information of the other in
        connection with these Terms. Each party agrees to use the other's
        confidential information only to exercise its rights and perform its
        obligations under these Terms, and to protect it with the same
        degree of care it uses for its own confidential information (and no
        less than reasonable care).
      </p>

      <h2>Suspension &amp; termination</h2>
      <p>
        You may stop using Axle and cancel your subscription at any time. We
        may suspend or terminate accounts that violate these Terms, pose a
        security or legal risk, or have unpaid fees past due. On
        termination, your license to use Axle ends; we'll make Customer Data
        available for export for a reasonable period afterward (currently 30
        days) before deleting it, except where we're required to retain it
        by law.
      </p>

      <h2>Force majeure</h2>
      <p>
        Neither party is liable for delay or failure to perform caused by
        circumstances beyond its reasonable control, including natural
        disasters, internet or utility failures, government action, or
        failures of third-party providers.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms as the product evolves. Material changes
        will be communicated by email or in-app notice at least 14 days
        before taking effect; continued use of Axle after that constitutes
        acceptance.
      </p>

      <h2>Governing law &amp; disputes</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of
        Nigeria, without regard to conflict-of-law principles. Any dispute
        arising out of or relating to these Terms or Axle will be subject to
        the exclusive jurisdiction of the courts of the Federal Republic of
        Nigeria.
      </p>

      <h2>General</h2>
      <p>
        These Terms, together with our <Link href="/privacy">Privacy Policy</Link> and any
        order form or Data Processing Addendum, are the entire agreement
        between you and NorthPoint regarding Axle. If any provision is found
        unenforceable, the rest remain in effect. Our failure to enforce a
        provision isn't a waiver of it. You may not assign these Terms
        without our consent; we may assign them in connection with a merger,
        acquisition, or sale of assets. Notices to you may be sent to the
        email associated with your account.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>
    </LegalPageLayout>
  );
}
