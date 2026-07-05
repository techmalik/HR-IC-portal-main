import { faqItems } from "./faqData";
import { ssrHtmlShell, escHtml } from "../ssrShared";

const BASE_URL = "https://www.axlehq.app";

export function getFaqHtml(): string {
  const sections = Array.from(new Set(faqItems.map((f) => f.section)));

  const sectionsHtml = sections
    .map((section) => {
      const items = faqItems.filter((f) => f.section === section);
      const detailsHtml = items
        .map(
          (item) => `
        <details>
          <summary>${escHtml(item.question)}</summary>
          <div class="faq-answer">${escHtml(item.answer)}</div>
        </details>`
        )
        .join("\n");

      return `
      <section class="ssr-faq-section">
        <h2>${escHtml(section)}</h2>
        ${detailsHtml}
      </section>`;
    })
    .join("\n");

  const bodyHtml = `
    <div class="ssr-hero">
      <h1>Frequently Asked Questions</h1>
      <p>Everything you need to know about managing contractors with Axle — from timesheets and invoices to compliance and roles.</p>
    </div>
    <main class="ssr-main">
      ${sectionsHtml}
      <div class="ssr-cta-block">
        <h3>Still have questions?</h3>
        <p>Try Axle free and see how it fits your contractor workflow. No credit card required.</p>
        <a href="/signup" class="ssr-cta-btn">Get started free</a>
      </div>
    </main>`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return ssrHtmlShell({
    title: "FAQ — Axle Contractor Management Platform",
    metaDescription:
      "Answers to the most common questions about Axle: timesheets, invoice approvals, OOO management, contractor compliance, roles, and pricing.",
    canonicalPath: "/faq",
    jsonLd: faqJsonLd,
    bodyHtml,
  });
}
