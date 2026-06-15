import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";

const COMPANY = "TeamFlow";
const CONTACT_EMAIL = "legal@teamflow.app";
const LAST_UPDATED = "June 15, 2026";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/dpa", label: "Data Processing Addendum" },
];

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const [location, setLocation] = useLocation();

  // Legal pages are long; always start at the top when navigating between them.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 font-semibold"
            data-testid="link-home"
          >
            <Layers className="w-5 h-5 text-primary" />
            {COMPANY}
          </button>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 mb-8">
          This is a template document provided for convenience. Review it with
          qualified legal counsel before relying on it in production.
        </p>

        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </article>

        <nav className="mt-16 pt-8 border-t border-border">
          <h2 className="text-sm font-semibold mb-3">More legal documents</h2>
          <ul className="space-y-2 text-sm">
            {LEGAL_LINKS.filter((l) => l.href !== location).map((l) => (
              <li key={l.href}>
                <button
                  onClick={() => setLocation(l.href)}
                  className="text-primary hover:underline"
                  data-testid={`link-legal-${l.href.slice(1)}`}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Questions? Contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </nav>
      </main>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service ("Terms") govern your access to and use of the{" "}
        {COMPANY} platform and related services (the "Service"). By creating an
        account or using the Service, you agree to be bound by these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        {COMPANY} provides workforce administration tooling for organizations and
        their independent contractors, including timesheet, invoice, expense,
        out-of-office, and performance-review workflows. We may add, change, or
        remove features over time.
      </p>

      <h2>2. Accounts and organizations</h2>
      <p>
        The Service is organized around organizations. The person who creates an
        organization (the "Owner") is responsible for the conduct of users they
        invite and for the data their organization submits. You are responsible
        for safeguarding your credentials and for all activity under your
        account. Notify us promptly of any unauthorized use.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service in violation of any applicable law or regulation;</li>
        <li>upload data you do not have the right to share;</li>
        <li>attempt to access another organization's data;</li>
        <li>probe, scan, or test the vulnerability of the Service without authorization; or</li>
        <li>interfere with or disrupt the integrity or performance of the Service.</li>
      </ul>

      <h2>4. Customer data</h2>
      <p>
        You retain all rights to the data your organization submits ("Customer
        Data"). You grant us a limited license to host, process, and transmit
        Customer Data solely to provide and improve the Service. Our processing
        of personal data is described in our Privacy Policy and, where
        applicable, our Data Processing Addendum.
      </p>

      <h2>5. Fees</h2>
      <p>
        Paid plans, where offered, are billed in advance on a recurring basis and
        are non-refundable except as required by law. We will give reasonable
        notice of any change to fees. During any free or beta period, the Service
        is provided without charge and may be modified or discontinued.
      </p>

      <h2>6. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate
        access if you breach these Terms or if necessary to protect the Service
        or other users. On termination, your right to use the Service ceases and
        we may delete Customer Data after a reasonable retention period.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The Service is provided "as is" without warranties of any kind, whether
        express or implied, to the maximum extent permitted by law. We do not
        warrant that the Service will be uninterrupted, error-free, or secure.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {COMPANY} will not be liable for
        any indirect, incidental, special, consequential, or punitive damages, or
        for any loss of profits or revenues, whether incurred directly or
        indirectly.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes,
        we will provide notice through the Service or by email. Continued use of
        the Service after changes take effect constitutes acceptance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how {COMPANY} collects, uses, and protects
        personal data when you use the Service. It applies to personal data we
        process as a controller. Where we process personal data on behalf of an
        organization, we act as a processor under that organization's
        instructions and our Data Processing Addendum.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email address, username, job
          title, role, and organization membership.
        </li>
        <li>
          <strong>Workforce data:</strong> timesheets, invoices, expenses,
          out-of-office requests, evaluations, and related financial details
          such as hourly rate and currency.
        </li>
        <li>
          <strong>Usage data:</strong> log data, device and browser information,
          and request identifiers used for security and diagnostics.
        </li>
      </ul>

      <h2>2. How we use data</h2>
      <p>We use personal data to:</p>
      <ul>
        <li>provide, maintain, and secure the Service;</li>
        <li>authenticate users and enforce organization boundaries;</li>
        <li>send transactional notifications (for example invitations, approvals, and reminders);</li>
        <li>diagnose problems and improve reliability; and</li>
        <li>comply with legal obligations.</li>
      </ul>

      <h2>3. Legal bases</h2>
      <p>
        Where the GDPR or similar laws apply, we rely on performance of a
        contract, our legitimate interests in operating and securing the Service,
        your consent (where requested), and compliance with legal obligations.
      </p>

      <h2>4. Sharing</h2>
      <p>
        We share personal data with service providers that help us run the
        Service (for example email delivery and cloud hosting), each bound by
        confidentiality and data-protection obligations. We do not sell personal
        data. We may disclose data where required by law or to protect rights and
        safety.
      </p>

      <h2>5. Retention</h2>
      <p>
        We retain personal data for as long as needed to provide the Service and
        to meet legal, accounting, or reporting requirements. When data is no
        longer needed, we delete or anonymize it.
      </p>

      <h2>6. Security</h2>
      <p>
        We use technical and organizational measures appropriate to the risk,
        including encrypted transport, hashed credentials and session tokens,
        per-organization data isolation, and access controls. No method of
        transmission or storage is completely secure.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct,
        delete, export, or restrict processing of your personal data, and to
        object to certain processing. To exercise these rights, contact your
        organization administrator or email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Personal data may be processed in countries other than your own. Where
        required, we use appropriate safeguards such as standard contractual
        clauses for such transfers.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this Policy from time to time and will post the updated
        version with a new "Last updated" date.
      </p>

      <h2>10. Contact</h2>
      <p>
        For privacy questions, contact{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        This Cookie Policy explains how {COMPANY} uses cookies and similar
        technologies when you use the Service.
      </p>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small text files stored on your device. They help websites
        function and remember information about your visit.
      </p>

      <h2>2. Cookies we use</h2>
      <ul>
        <li>
          <strong>Strictly necessary:</strong> we use a session cookie to keep
          you signed in and to protect your account. The Service cannot function
          without it.
        </li>
        <li>
          <strong>Preferences:</strong> we may store interface preferences such
          as theme so the Service remembers your choices.
        </li>
      </ul>
      <p>
        We do not use advertising cookies. If we add analytics or other
        non-essential cookies in the future, we will request consent where
        required.
      </p>

      <h2>3. Managing cookies</h2>
      <p>
        Most browsers let you block or delete cookies. Blocking strictly
        necessary cookies will prevent you from signing in to the Service.
      </p>

      <h2>4. Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

export function DpaPage() {
  return (
    <LegalLayout title="Data Processing Addendum">
      <p>
        This Data Processing Addendum ("DPA") forms part of the agreement between
        the organization ("Controller") and {COMPANY} ("Processor") and applies
        to the processing of personal data by {COMPANY} on the Controller's
        behalf in connection with the Service.
      </p>

      <h2>1. Roles</h2>
      <p>
        The Controller determines the purposes and means of processing Customer
        Data. {COMPANY} processes Customer Data only on documented instructions
        from the Controller, including with regard to international transfers,
        unless required to do otherwise by law.
      </p>

      <h2>2. Subject matter and duration</h2>
      <p>
        The subject matter is the provision of the Service. Processing continues
        for the duration of the agreement and any subsequent retention period.
      </p>

      <h2>3. Nature and purpose</h2>
      <p>
        {COMPANY} processes Customer Data to host workforce-administration
        workflows, including timesheets, invoices, expenses, out-of-office
        requests, and evaluations, and to provide related notifications and
        support.
      </p>

      <h2>4. Categories of data and data subjects</h2>
      <p>
        Personal data may include names, contact details, role and organization
        information, and financial details such as rates and invoice amounts.
        Data subjects include the Controller's administrators, supervisors, and
        contractors.
      </p>

      <h2>5. Confidentiality</h2>
      <p>
        {COMPANY} ensures that persons authorized to process Customer Data are
        bound by appropriate confidentiality obligations.
      </p>

      <h2>6. Security</h2>
      <p>
        {COMPANY} implements appropriate technical and organizational measures to
        protect Customer Data, including encryption in transit, hashed
        credentials and session tokens, per-organization isolation, and access
        controls.
      </p>

      <h2>7. Sub-processors</h2>
      <p>
        The Controller authorizes {COMPANY} to engage sub-processors (such as
        cloud hosting and email-delivery providers) to support the Service.{" "}
        {COMPANY} remains responsible for sub-processors' compliance with this
        DPA and will provide notice of material changes.
      </p>

      <h2>8. Data subject requests</h2>
      <p>
        Taking into account the nature of the processing, {COMPANY} assists the
        Controller with appropriate measures to fulfil the Controller's
        obligations to respond to data subject requests.
      </p>

      <h2>9. Personal data breaches</h2>
      <p>
        {COMPANY} notifies the Controller without undue delay after becoming
        aware of a personal data breach affecting Customer Data and provides
        reasonable information to assist the Controller's own obligations.
      </p>

      <h2>10. Deletion and return</h2>
      <p>
        On termination of the Service, {COMPANY} deletes or returns Customer Data
        in accordance with the Controller's instructions, subject to retention
        required by law.
      </p>

      <h2>11. Audits</h2>
      <p>
        {COMPANY} makes available information reasonably necessary to demonstrate
        compliance with this DPA and allows for and contributes to audits as
        required by applicable law.
      </p>

      <h2>12. Contact</h2>
      <p>
        Data-protection inquiries can be sent to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
