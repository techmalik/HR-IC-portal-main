import { ssrHtmlShell, escHtml, escAttr } from "../ssrShared";
import {
  getPublishedIndustries as getIndustries,
  getPublishedIndustryBySlug as getIndustryBySlug,
  getPublishedCompetitors as getCompetitors,
  getPublishedCompetitorBySlug as getCompetitorBySlug,
} from "./programmaticStorage";
import type { IndustryPage, CompetitorPage } from "./programmaticData";

const BASE_URL = "https://axlehq.app";

function organizationJsonLd() {
  return {
    "@type": "Organization",
    name: "Axle",
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.png`,
    description:
      "Contractor operations platform for SaaS and services teams — timesheets, invoice approvals, OOO, and audit trail.",
  };
}

function softwareApplicationJsonLd() {
  return {
    "@type": "SoftwareApplication",
    name: "Axle",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan for up to 3 contractors",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
    },
  };
}

function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function combinedJsonLd(parts: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": parts,
  };
}

function faqHtml(faqs: { q: string; a: string }[]) {
  return `
  <section class="ssr-faq-section">
    <h2>Frequently Asked Questions</h2>
    ${faqs
      .map(
        (f) => `
      <details>
        <summary>${escHtml(f.q)}</summary>
        <div class="faq-answer">${escHtml(f.a)}</div>
      </details>`
      )
      .join("\n")}
  </section>`;
}

function ctaHtml(headline: string, sub: string) {
  return `
  <div class="ssr-cta-block">
    <h3>${escHtml(headline)}</h3>
    <p>${escHtml(sub)}</p>
    <a href="/signup" class="ssr-cta-btn">Start free — no credit card</a>
  </div>`;
}

function internalLinksHtml(currentSlug: string, kind: "industry" | "competitor") {
  const otherIndustries = getIndustries()
    .filter((i) => kind !== "industry" || i.slug !== currentSlug)
    .slice(0, 6);
  const otherCompetitors = getCompetitors()
    .filter((c) => kind !== "competitor" || c.slug !== currentSlug)
    .slice(0, 6);

  const indLinks = otherIndustries
    .map(
      (i) =>
        `<a href="/contractor-management-for-${escAttr(i.slug)}">${escHtml(i.heroTitle.replace("Contractor Management for ", ""))}</a>`
    )
    .join("");
  const compLinks = otherCompetitors
    .map(
      (c) =>
        `<a href="/${escAttr(c.slug)}">${escHtml(c.competitorName)} alternative</a>`
    )
    .join("");

  return `
  <section class="ssr-related">
    <h3>Explore more</h3>
    <div class="ssr-related-grid">
      <div class="ssr-related-card"><strong>By industry</strong><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">${indLinks}</div></div>
      <div class="ssr-related-card"><strong>Compare Axle vs.</strong><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">${compLinks}</div></div>
      <div class="ssr-related-card"><strong>More resources</strong><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;"><a href="/blog">Blog</a><a href="/faq">FAQ</a><a href="/">Home</a></div></div>
    </div>
  </section>`;
}

export function getIndustryHtml(slug: string): string | null {
  const page = getIndustryBySlug(slug);
  if (!page) return null;
  return renderIndustry(page);
}

function renderIndustry(page: IndustryPage): string {
  const canonicalPath = `/contractor-management-for-${page.slug}`;
  const painPointsHtml = page.painPoints
    .map((p) => `<li>${escHtml(p)}</li>`)
    .join("");
  const useCasesHtml = page.useCases
    .map(
      (u) => `
    <div class="ssr-related-card">
      <strong>${escHtml(u.title)}</strong>
      <p style="margin-top:6px;font-size:0.9375rem;color:var(--text-muted);">${escHtml(u.description)}</p>
    </div>`
    )
    .join("");

  const bodyHtml = `
    <main class="ssr-main">
      <nav class="ssr-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="sep">›</span>
        <span>Contractor management for ${escHtml(page.name)}</span>
      </nav>
      <h1>${escHtml(page.heroTitle)}</h1>
      <div class="ssr-meta"><span class="ssr-tag">For ${escHtml(page.shortName)}</span><span>Updated ${escHtml(page.updatedDate)}</span></div>
      <p style="font-size:1.0625rem;">${escHtml(page.intro)}</p>

      <h2>What ${escHtml(page.name)} struggle with</h2>
      <ul>${painPointsHtml}</ul>

      <h2>How Axle fits ${escHtml(page.name)}</h2>
      <div class="ssr-related-grid" style="margin-top:16px;">${useCasesHtml}</div>

      ${ctaHtml(`Run your ${page.name} contractor team without spreadsheets`, "Most teams are fully set up in under a day. Free for up to 3 contractors.")}

      ${faqHtml(page.faqs)}

      ${internalLinksHtml(page.slug, "industry")}
    </main>`;

  const jsonLd = combinedJsonLd([
    organizationJsonLd(),
    softwareApplicationJsonLd(),
    breadcrumbJsonLd([
      { name: "Home", url: BASE_URL },
      { name: page.heroTitle, url: `${BASE_URL}${canonicalPath}` },
    ]),
    faqJsonLd(page.faqs),
  ]);

  return ssrHtmlShell({
    title: page.metaTitle,
    metaDescription: page.metaDescription,
    canonicalPath,
    ogTitle: page.heroTitle,
    ogDescription: page.metaDescription,
    jsonLd,
    bodyHtml,
  });
}

export function getCompetitorHtml(slug: string): string | null {
  const page = getCompetitorBySlug(slug);
  if (!page) return null;
  return renderCompetitor(page);
}

function renderCompetitor(page: CompetitorPage): string {
  const canonicalPath = `/${page.slug}`;
  const weaknessesHtml = page.competitorWeaknesses
    .map((w) => `<li>${escHtml(w)}</li>`)
    .join("");
  const strengthsHtml = page.axleStrengths
    .map((s) => `<li>${escHtml(s)}</li>`)
    .join("");
  const tableRows = page.comparison
    .map(
      (c) => `
    <tr>
      <td><strong>${escHtml(c.feature)}</strong></td>
      <td>${escHtml(c.axle)}</td>
      <td>${escHtml(c.competitor)}</td>
    </tr>`
    )
    .join("");

  const bodyHtml = `
    <main class="ssr-main">
      <nav class="ssr-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="sep">›</span>
        <span>${escHtml(page.competitorName)} alternative</span>
      </nav>
      <h1>The Best ${escHtml(page.competitorName)} Alternative for Contractor Ops</h1>
      <div class="ssr-meta"><span class="ssr-tag">vs. ${escHtml(page.competitorName)}</span><span>Updated ${escHtml(page.updatedDate)}</span></div>
      <p style="font-size:1.0625rem;">${escHtml(page.intro)}</p>

      <div class="ssr-callout"><strong>How Axle positions:</strong> ${escHtml(page.positioning)}</div>

      <h2>Where ${escHtml(page.competitorName)} can fall short</h2>
      <ul>${weaknessesHtml}</ul>

      <h2>Where Axle stands out</h2>
      <ul>${strengthsHtml}</ul>

      <h2>Axle vs. ${escHtml(page.competitorName)}: feature comparison</h2>
      <div class="ssr-table-wrap">
        <table>
          <thead><tr><th>Feature</th><th>Axle</th><th>${escHtml(page.competitorName)}</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>

      <h2>Pricing comparison</h2>
      <p>${escHtml(page.pricingNote)}</p>

      ${ctaHtml(`Try the ${page.competitorName} alternative built for contractor ops`, "Free for up to 3 contractors. No credit card required. Most teams set up in under a day.")}

      ${faqHtml(page.faqs)}

      ${internalLinksHtml(page.slug, "competitor")}
    </main>`;

  const jsonLd = combinedJsonLd([
    organizationJsonLd(),
    softwareApplicationJsonLd(),
    breadcrumbJsonLd([
      { name: "Home", url: BASE_URL },
      { name: `${page.competitorName} alternative`, url: `${BASE_URL}${canonicalPath}` },
    ]),
    faqJsonLd(page.faqs),
  ]);

  return ssrHtmlShell({
    title: page.metaTitle,
    metaDescription: page.metaDescription,
    canonicalPath,
    ogTitle: `The Best ${page.competitorName} Alternative for Contractor Ops`,
    ogDescription: page.metaDescription,
    jsonLd,
    bodyHtml,
  });
}

// ── Index pages (lightweight directory pages for crawlers) ──

export function getIndustriesIndexHtml(): string {
  const items = getIndustries();
  const cardsHtml = items
    .map(
      (i) => `
    <article class="ssr-blog-card">
      <h2><a href="/contractor-management-for-${escAttr(i.slug)}">${escHtml(i.heroTitle)}</a></h2>
      <p class="ssr-blog-excerpt">${escHtml(i.metaDescription)}</p>
    </article>`
    )
    .join("\n");

  const bodyHtml = `
    <div class="ssr-hero"><h1>Contractor Management by Industry</h1><p>Industry-specific guides for managing independent contractors with Axle.</p></div>
    <main class="ssr-main"><div class="ssr-blog-grid">${cardsHtml}</div></main>`;

  return ssrHtmlShell({
    title: "Contractor Management by Industry | Axle",
    metaDescription: "Industry-specific guides for managing independent contractors — agencies, dev shops, studios, accounting, law, fintech, and more.",
    canonicalPath: "/industries",
    jsonLd: combinedJsonLd([organizationJsonLd()]),
    bodyHtml,
  });
}

export function getCompetitorsIndexHtml(): string {
  const items = getCompetitors();
  const cardsHtml = items
    .map(
      (c) => `
    <article class="ssr-blog-card">
      <h2><a href="/${escAttr(c.slug)}">${escHtml(c.competitorName)} alternative</a></h2>
      <p class="ssr-blog-excerpt">${escHtml(c.metaDescription)}</p>
    </article>`
    )
    .join("\n");

  const bodyHtml = `
    <div class="ssr-hero"><h1>Axle vs. Other Contractor Tools</h1><p>How Axle compares to other contractor management and adjacent tools.</p></div>
    <main class="ssr-main"><div class="ssr-blog-grid">${cardsHtml}</div></main>`;

  return ssrHtmlShell({
    title: "Compare Axle vs. Contractor Management Tools",
    metaDescription: "Compare Axle against Deel, Remote, Rippling, Bonsai, Worksuite, and more contractor management tools.",
    canonicalPath: "/compare",
    jsonLd: combinedJsonLd([organizationJsonLd()]),
    bodyHtml,
  });
}
