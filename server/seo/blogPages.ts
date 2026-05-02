import { blogArticles, type BlogArticle } from "./blogData";
import { ssrHtmlShell, escHtml, escAttr } from "../ssrShared";

const BASE_URL = "https://teamflow.app";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getRelatedArticles(currentSlug: string, count = 3): BlogArticle[] {
  const others = blogArticles.filter((a) => a.slug !== currentSlug);
  // Rotate based on current slug index so each article gets different related articles
  const idx = blogArticles.findIndex((a) => a.slug === currentSlug);
  const offset = (idx * 3) % others.length;
  const rotated = [...others.slice(offset), ...others.slice(0, offset)];
  return rotated.slice(0, count);
}

export function getBlogIndexHtml(): string {
  const cardsHtml = blogArticles
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

  const bodyHtml = `
    <div class="ssr-hero">
      <h1>The TeamFlow Blog</h1>
      <p>Practical guides for SaaS teams managing independent contractors — timesheets, invoices, compliance, and remote ops.</p>
    </div>
    <main class="ssr-main">
      <div class="ssr-blog-grid">
        ${cardsHtml}
      </div>
    </main>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "TeamFlow Blog",
    description:
      "Practical guides for SaaS teams managing independent contractors.",
    url: `${BASE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "TeamFlow",
      url: BASE_URL,
    },
  };

  return ssrHtmlShell({
    title: "TeamFlow Blog — Contractor Operations for SaaS Teams",
    metaDescription:
      "Practical guides on managing independent contractors: timesheets, invoice compliance, misclassification, remote team communication, and more.",
    canonicalPath: "/blog",
    jsonLd,
    bodyHtml,
  });
}

export function getBlogArticleHtml(slug: string): string | null {
  const article = blogArticles.find((a) => a.slug === slug);
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
        <span>By TeamFlow Editorial Team</span>
      </div>

      ${article.bodyHtml}

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
      name: "TeamFlow Editorial Team",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "TeamFlow",
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
    title: `${article.title} | TeamFlow Blog`,
    metaDescription: article.metaDescription,
    canonicalPath: `/blog/${article.slug}`,
    ogTitle: article.title,
    ogDescription: article.metaDescription,
    jsonLd,
    bodyHtml,
  });
}
