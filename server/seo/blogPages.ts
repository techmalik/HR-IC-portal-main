import { getArticles, getArticleBySlug, type BlogArticle } from "./blogStorage";
import { ssrHtmlShell, escHtml, escAttr } from "../ssrShared";

const BASE_URL = "https://www.axlehq.app";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getRelatedArticles(currentSlug: string, count = 3): BlogArticle[] {
  const articles = getArticles();
  const others = articles.filter((a) => a.slug !== currentSlug);
  const idx = articles.findIndex((a) => a.slug === currentSlug);
  const offset = (idx * 3) % (others.length || 1);
  const rotated = [...others.slice(offset), ...others.slice(0, offset)];
  return rotated.slice(0, count);
}

function emailCaptureFormHtml(returnTo: string, subscribed: boolean, error?: string): string {
  const safeReturnTo = escAttr(returnTo);
  if (subscribed) {
    return `
    <aside class="ssr-email-capture">
      <h3>Get contractor ops tips in your inbox</h3>
      <div class="ssr-email-success">You're subscribed! We'll send practical tips straight to your inbox.</div>
    </aside>`;
  }
  return `
    <aside class="ssr-email-capture">
      <h3>Get contractor ops tips in your inbox</h3>
      <p>Practical guides on timesheets, invoices, compliance, and remote team management, delivered free.</p>
      <form class="ssr-email-form" method="POST" action="/api/blog/subscribe">
        <input type="hidden" name="returnTo" value="${safeReturnTo}">
        <input
          class="ssr-email-input"
          type="email"
          name="email"
          placeholder="you@company.com"
          required
          autocomplete="email"
          aria-label="Email address"
        >
        <button class="ssr-email-submit" type="submit">Subscribe free</button>
      </form>
      ${error ? `<p class="ssr-email-error">${escHtml(error)}</p>` : ""}
    </aside>`;
}

export interface BlogPageOptions {
  subscribed?: boolean;
  error?: string;
}

export function getBlogIndexHtml(opts: BlogPageOptions = {}): string {
  const articles = getArticles();
  const cardsHtml = articles
    .map(
      (a) => `
    <article class="ssr-blog-card">
      <h2><a href="/blog/${escAttr(a.slug)}">${escHtml(a.title)}</a></h2>
      <p class="ssr-blog-excerpt">${escHtml(a.excerpt)}</p>
      <div style="display:flex;align-items:center;gap:14px;">
        <span class="ssr-blog-date">${formatDate(a.publishedDate)}</span>
        <span class="ssr-tag">${a.readingMinutes} min read</span>
      </div>
    </article>`
    )
    .join("\n");

  const captureForm = emailCaptureFormHtml("/blog", opts.subscribed ?? false, opts.error);

  const bodyHtml = `
    <div class="ssr-hero">
      <h1>The Axle Blog</h1>
      <p>Practical guides for SaaS teams managing independent contractors: timesheets, invoices, compliance, and remote ops.</p>
    </div>
    <main class="ssr-main">
      ${captureForm}
      <div class="ssr-blog-grid">
        ${cardsHtml}
      </div>
    </main>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Axle Blog",
    description:
      "Practical guides for SaaS teams managing independent contractors.",
    url: `${BASE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Axle",
      url: BASE_URL,
    },
  };

  return ssrHtmlShell({
    title: "Axle Blog: Contractor Operations for SaaS Teams",
    metaDescription:
      "Practical guides on managing independent contractors: timesheets, invoice compliance, misclassification, remote team communication, and more.",
    canonicalPath: "/blog",
    jsonLd,
    bodyHtml,
  });
}

export function getBlogArticleHtml(slug: string, opts: BlogPageOptions = {}): string | null {
  const article = getArticleBySlug(slug);
  if (!article) return null;

  const related = getRelatedArticles(slug);
  const relatedCardsHtml = related
    .map(
      (r) => `
    <div class="ssr-related-card">
      <a href="/blog/${escAttr(r.slug)}">${escHtml(r.title)}</a>
      <span class="ssr-tag">${r.readingMinutes} min read</span>
    </div>`
    )
    .join("\n");

  const returnTo = `/blog/${slug}`;
  const captureForm = emailCaptureFormHtml(returnTo, opts.subscribed ?? false, opts.error);

  const bodyHtml = `
    <main class="ssr-main">
      <nav class="ssr-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="sep">›</span>
        <a href="/blog">Blog</a>
        <span class="sep">›</span>
        <span>${escHtml(article.title)}</span>
      </nav>

      <h1>${escHtml(article.title)}</h1>

      <div class="ssr-meta">
        <span class="ssr-tag">${article.readingMinutes} min read</span>
        <span>Published ${formatDate(article.publishedDate)}</span>
        <span>Updated ${formatDate(article.updatedDate)}</span>
        <span>By Axle Editorial Team</span>
      </div>

      ${article.bodyHtml}

      ${captureForm}

      <section class="ssr-related">
        <h3>Related Articles</h3>
        <div class="ssr-related-grid">
          ${relatedCardsHtml}
        </div>
      </section>
    </main>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedDate,
    dateModified: article.updatedDate,
    author: {
      "@type": "Organization",
      name: "Axle Editorial Team",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Axle",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/favicon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${article.slug}`,
    },
  };

  return ssrHtmlShell({
    title: `${article.seoTitle ?? article.title} | Axle Blog`,
    metaDescription: article.metaDescription,
    canonicalPath: `/blog/${article.slug}`,
    ogTitle: article.title,
    ogDescription: article.metaDescription,
    jsonLd,
    bodyHtml,
  });
}
