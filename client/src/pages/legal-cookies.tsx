import { Link } from "wouter";
import { usePageMeta } from "@/lib/use-page-meta";
import { LegalPageLayout } from "@/components/legal-page-layout";

export default function CookiePolicyPage() {
  usePageMeta({
    title: "Cookie Policy — Axle",
    description: "How Axle uses cookies and similar technologies.",
    canonical: "https://axlehq.app/cookies",
  });

  return (
    <LegalPageLayout title="Cookie Policy" updated="July 11, 2026">
      <p>
        This policy explains how Axle, a product of NorthPoint Technologies
        Ltd, uses cookies and similar technologies. It should be read
        alongside our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What cookies are</h2>
      <p>
        Cookies are small text files stored on your device by your browser.
        They let a site recognize your device between requests.
      </p>

      <h2>Cookies we use</h2>
      <p>
        We use only strictly necessary cookies — the kind required for the
        service to function and that don't require consent under most
        cookie laws:
      </p>
      <ul>
        <li>
          <strong>Session cookies</strong> (e.g. <code>session_token</code>,{" "}
          <code>bo_session_token</code>) that keep you signed in and
          authenticate your requests to Axle.
        </li>
      </ul>
      <p>
        We do not use third-party advertising cookies, cross-site tracking
        cookies, or social-media tracking pixels. In-app usage analytics we
        collect for product improvement is stored client-side and is not
        cookie-based.
      </p>

      <h2>Controlling cookies</h2>
      <p>
        Most browsers let you block or delete cookies through their
        settings. Because we only use strictly necessary cookies, blocking
        them will prevent you from staying signed in to Axle.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If the cookies we use change materially — for example, if we
        introduce analytics or advertising cookies in the future — we'll
        update this page and, where required by law, ask for your consent.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@axlehq.app">support@axlehq.app</a>.
      </p>
    </LegalPageLayout>
  );
}
