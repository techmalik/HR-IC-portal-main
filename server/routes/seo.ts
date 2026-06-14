import type { Express, Response } from "express";
import { authMiddleware, requirePlatformAdmin, asyncHandler } from "./shared";

const SEO_CACHE = "public, max-age=86400, stale-while-revalidate=3600";
const BLOG_CACHE = "public, max-age=300, stale-while-revalidate=60";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BASE_URL = "https://teamflow.app";

function validateBlogArticleBody(body: Record<string, any>): string | null {
  const { slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml } = body;
  if (!slug || !title || !metaDescription || !publishedDate || !updatedDate || readingMinutes == null || !excerpt || !bodyHtml) {
    return "All fields are required: slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml";
  }
  if (!SLUG_RE.test(slug)) return "slug must contain only lowercase letters, numbers, and hyphens";
  if (!DATE_RE.test(publishedDate)) return "publishedDate must be in YYYY-MM-DD format";
  if (!DATE_RE.test(updatedDate)) return "updatedDate must be in YYYY-MM-DD format";
  const mins = Number(readingMinutes);
  if (!Number.isInteger(mins) || mins < 1) return "readingMinutes must be a positive integer";
  if (typeof title !== "string" || title.trim().length === 0) return "title must not be empty";
  if (typeof metaDescription !== "string" || metaDescription.length > 160) return "metaDescription must be 160 characters or fewer";
  if (typeof excerpt !== "string" || excerpt.trim().length === 0) return "excerpt must not be empty";
  if (typeof bodyHtml !== "string" || bodyHtml.trim().length === 0) return "bodyHtml must not be empty";
  return null;
}

const ALLOWED_STATUSES = new Set(["draft", "published"]);
function validateStatusField(b: any): string | null {
  if (b.status !== undefined && !ALLOWED_STATUSES.has(b.status)) {
    return `status must be "draft" or "published"`;
  }
  return null;
}
function validateIndustryBody(b: any, mode: "create" | "update" = "create"): string | null {
  if (b == null || typeof b !== "object") return "request body must be an object";
  const required = ["slug", "name", "shortName", "heroTitle", "metaTitle", "metaDescription", "intro", "painPoints", "useCases", "faqs", "updatedDate"];
  if (mode === "create") {
    for (const k of required) if (b[k] == null) return `Field "${k}" is required`;
  }
  if (b.slug !== undefined && !SLUG_RE.test(b.slug)) return "slug must be lowercase letters, numbers, and hyphens";
  if (b.metaDescription !== undefined && (typeof b.metaDescription !== "string" || b.metaDescription.length > 200)) return "metaDescription must be a string ≤ 200 chars";
  if (b.painPoints !== undefined && !Array.isArray(b.painPoints)) return "painPoints must be an array";
  if (b.useCases !== undefined && !Array.isArray(b.useCases)) return "useCases must be an array";
  if (b.faqs !== undefined && !Array.isArray(b.faqs)) return "faqs must be an array";
  return validateStatusField(b);
}
function validateCompetitorBody(b: any, mode: "create" | "update" = "create"): string | null {
  if (b == null || typeof b !== "object") return "request body must be an object";
  const required = ["slug", "competitorName", "metaTitle", "metaDescription", "intro", "positioning", "competitorWeaknesses", "teamflowStrengths", "comparison", "pricingNote", "faqs", "updatedDate"];
  if (mode === "create") {
    for (const k of required) if (b[k] == null) return `Field "${k}" is required`;
  }
  if (b.slug !== undefined) {
    if (!SLUG_RE.test(b.slug)) return "slug must be lowercase letters, numbers, and hyphens";
    if (!b.slug.endsWith("-alternative")) return "competitor slug must end with '-alternative'";
  }
  if (b.metaDescription !== undefined && (typeof b.metaDescription !== "string" || b.metaDescription.length > 200)) return "metaDescription must be a string ≤ 200 chars";
  if (b.competitorWeaknesses !== undefined && !Array.isArray(b.competitorWeaknesses)) return "competitorWeaknesses must be an array";
  if (b.teamflowStrengths !== undefined && !Array.isArray(b.teamflowStrengths)) return "teamflowStrengths must be an array";
  if (b.comparison !== undefined && !Array.isArray(b.comparison)) return "comparison must be an array";
  if (b.faqs !== undefined && !Array.isArray(b.faqs)) return "faqs must be an array";
  return validateStatusField(b);
}

function buildSitemapXml(urls: Array<{ loc: string; lastmod: string; changefreq?: string; priority?: string }>): string {
  const urlEntries = urls
    .map(
      ({ loc, lastmod, changefreq = "monthly", priority = "0.7" }) =>
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}

export async function registerSeoRoutes(app: Express): Promise<void> {
  const { getBlogIndexHtml, getBlogArticleHtml } = await import("../seo/blogPages");
  const { addSubscriber, isValidEmail } = await import("../seo/emailCapture");
  const { getFaqHtml } = await import("../seo/faqPages");
  const {
    getArticles: getBlogArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    BlogNotFoundError,
    BlogConflictError,
  } = await import("../seo/blogStorage");
  const { FAQ_LAST_UPDATED } = await import("../seo/faqData");
  const { recordView, getAllViewStats } = await import("../seo/blogViews");
  const {
    getIndustryHtml,
    getCompetitorHtml,
    getIndustriesIndexHtml,
    getCompetitorsIndexHtml,
  } = await import("../seo/programmaticPages");
  const {
    getIndustries,
    getCompetitors,
    getPublishedIndustries,
    getPublishedCompetitors,
    createIndustry,
    updateIndustry,
    deleteIndustry,
    createCompetitor,
    updateCompetitor,
    deleteCompetitor,
    ProgrammaticNotFoundError,
    ProgrammaticConflictError,
  } = await import("../seo/programmaticStorage");

  function handleBlogError(err: unknown, res: Response): void {
    if (err instanceof BlogNotFoundError || err instanceof BlogConflictError) {
      (res as any).status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }

  function handleProgrammaticError(err: unknown, res: Response): void {
    if (err instanceof ProgrammaticNotFoundError || err instanceof ProgrammaticConflictError) {
      (res as any).status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }

  // ── Admin Blog API ──
  app.get("/api/admin/blog-subscribers", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    const { getSubscribers } = await import("../seo/emailCapture");
    res.json(await getSubscribers());
  }));

  app.get("/api/admin/blog", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(await getBlogArticles());
  }));

  app.get("/api/admin/blog-analytics", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    const [articles, viewStats] = await Promise.all([getBlogArticles(), getAllViewStats()]);
    const analytics = articles.map((a) => {
      const stats = viewStats[a.slug] ?? { views: 0, referrers: {} };
      return {
        slug: a.slug,
        title: a.title,
        publishedDate: a.publishedDate,
        views: stats.views,
        referrers: stats.referrers,
      };
    });
    analytics.sort((a, b) => b.views - a.views);
    res.json(analytics);
  }));

  app.post("/api/admin/blog", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const validationError = validateBlogArticleBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const { slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml } = req.body;
    try {
      const article = await createArticle({ slug, title, metaDescription, publishedDate, updatedDate, readingMinutes: Number(readingMinutes), excerpt, bodyHtml });
      res.status(201).json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.put("/api/admin/blog/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const { slug: _bodySlug, ...rawUpdates } = req.body;
    const updates: Record<string, any> = {};
    const allowed = ["title", "metaDescription", "publishedDate", "updatedDate", "readingMinutes", "excerpt", "bodyHtml"] as const;
    for (const key of allowed) {
      if (rawUpdates[key] !== undefined) updates[key] = rawUpdates[key];
    }
    if (updates.readingMinutes !== undefined) {
      const mins = Number(updates.readingMinutes);
      if (!Number.isInteger(mins) || mins < 1) return res.status(400).json({ error: "readingMinutes must be a positive integer" });
      updates.readingMinutes = mins;
    }
    if (updates.publishedDate !== undefined && !DATE_RE.test(updates.publishedDate)) {
      return res.status(400).json({ error: "publishedDate must be in YYYY-MM-DD format" });
    }
    if (updates.updatedDate !== undefined && !DATE_RE.test(updates.updatedDate)) {
      return res.status(400).json({ error: "updatedDate must be in YYYY-MM-DD format" });
    }
    if (updates.metaDescription !== undefined && updates.metaDescription.length > 160) {
      return res.status(400).json({ error: "metaDescription must be 160 characters or fewer" });
    }
    try {
      const article = await updateArticle(req.params.slug, updates);
      res.json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.delete("/api/admin/blog/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try {
      await deleteArticle(req.params.slug);
      res.json({ success: true });
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  // ── Public blog routes ──
  app.post("/api/blog/subscribe", asyncHandler(async (req, res) => {
    const email = (req.body?.email ?? "").toString().trim();
    const rawReturnTo = (req.body?.returnTo ?? "/blog").toString().trim();
    const returnTo = /^\/blog(\/[a-z0-9-]*)?$/.test(rawReturnTo) ? rawReturnTo : "/blog";

    if (!email || !isValidEmail(email)) {
      const opts = { error: "Please enter a valid email address." };
      const html = returnTo.startsWith("/blog/")
        ? await getBlogArticleHtml(returnTo.replace("/blog/", ""), opts)
        : await getBlogIndexHtml(opts);
      if (!html) {
        res.redirect(`${returnTo}?error=invalid`);
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(html);
      return;
    }

    await addSubscriber(email, returnTo);
    res.redirect(`${returnTo}?subscribed=1`);
  }));

  app.get("/blog", asyncHandler(async (req, res) => {
    const subscribed = req.query.subscribed === "1";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", subscribed ? "no-store" : BLOG_CACHE);
    res.send(await getBlogIndexHtml({ subscribed }));
  }));

  app.get("/blog/:slug", asyncHandler(async (req, res) => {
    const subscribed = req.query.subscribed === "1";
    const html = await getBlogArticleHtml(req.params.slug, { subscribed });
    if (!html) {
      res.status(404).send("<h1>Article not found</h1>");
      return;
    }
    if (!subscribed) {
      await recordView(req.params.slug, req.headers.referer);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", subscribed ? "no-store" : BLOG_CACHE);
    res.send(html);
  }));

  // ── Programmatic SEO pages ──
  app.get("/contractor-management-for-:industry", asyncHandler(async (req, res) => {
    const html = await getIndustryHtml(req.params.industry);
    if (!html) {
      res.status(404).send("<h1>Page not found</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(html);
  }));

  app.get("/industries", asyncHandler(async (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(await getIndustriesIndexHtml());
  }));

  app.get("/compare", asyncHandler(async (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(await getCompetitorsIndexHtml());
  }));

  app.get(/^\/([a-z0-9-]+-alternative)$/, asyncHandler(async (req, res) => {
    const slug = req.params[0];
    const html = await getCompetitorHtml(slug);
    if (!html) {
      res.status(404).send("<h1>Page not found</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(html);
  }));

  // ── Programmatic SEO: admin CRUD ──
  app.get("/api/admin/seo/industries", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(await getIndustries());
  }));
  app.post("/api/admin/seo/industries", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateIndustryBody(req.body);
    if (err) return res.status(400).json({ error: err });
    try { res.status(201).json(await createIndustry(req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.put("/api/admin/seo/industries/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateIndustryBody(req.body, "update");
    if (err) return res.status(400).json({ error: err });
    try { res.json(await updateIndustry(req.params.slug, req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.delete("/api/admin/seo/industries/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try { await deleteIndustry(req.params.slug); res.status(204).end(); } catch (e) { handleProgrammaticError(e, res); }
  }));

  app.get("/api/admin/seo/competitors", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(await getCompetitors());
  }));
  app.post("/api/admin/seo/competitors", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateCompetitorBody(req.body);
    if (err) return res.status(400).json({ error: err });
    try { res.status(201).json(await createCompetitor(req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.put("/api/admin/seo/competitors/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateCompetitorBody(req.body, "update");
    if (err) return res.status(400).json({ error: err });
    try { res.json(await updateCompetitor(req.params.slug, req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.delete("/api/admin/seo/competitors/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try { await deleteCompetitor(req.params.slug); res.status(204).end(); } catch (e) { handleProgrammaticError(e, res); }
  }));

  // ── FAQ, robots.txt, sitemaps ──
  app.get("/faq", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(getFaqHtml());
  });

  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(
      `User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml\nSitemap: /sitemap-blog.xml\nSitemap: /sitemap-programmatic.xml\n`
    );
  });

  app.get("/sitemap.xml", asyncHandler(async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const [articles, industries, competitors] = await Promise.all([
      getBlogArticles(),
      getPublishedIndustries(),
      getPublishedCompetitors(),
    ]);
    const mostRecentArticleDate = articles.reduce(
      (max, a) => (a.updatedDate > max ? a.updatedDate : max),
      articles[0]?.updatedDate ?? today
    );
    const articleUrls = articles.map((a) => ({
      loc: `${BASE_URL}/blog/${a.slug}`,
      lastmod: a.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.7",
    }));
    const industryUrls = industries.map((i) => ({
      loc: `${BASE_URL}/contractor-management-for-${i.slug}`,
      lastmod: i.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const competitorUrls = competitors.map((c) => ({
      loc: `${BASE_URL}/${c.slug}`,
      lastmod: c.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const xml = buildSitemapXml([
      { loc: `${BASE_URL}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
      { loc: `${BASE_URL}/blog`, lastmod: mostRecentArticleDate, changefreq: "weekly", priority: "0.9" },
      { loc: `${BASE_URL}/faq`, lastmod: FAQ_LAST_UPDATED, changefreq: "monthly", priority: "0.8" },
      { loc: `${BASE_URL}/industries`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      { loc: `${BASE_URL}/compare`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      { loc: `${BASE_URL}/signup`, lastmod: today, changefreq: "monthly", priority: "0.8" },
      ...articleUrls,
      ...industryUrls,
      ...competitorUrls,
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  }));

  app.get("/sitemap-programmatic.xml", asyncHandler(async (_req, res) => {
    const [industries, competitors] = await Promise.all([getPublishedIndustries(), getPublishedCompetitors()]);
    const industryUrls = industries.map((i) => ({
      loc: `${BASE_URL}/contractor-management-for-${i.slug}`,
      lastmod: i.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const competitorUrls = competitors.map((c) => ({
      loc: `${BASE_URL}/${c.slug}`,
      lastmod: c.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const today = new Date().toISOString().slice(0, 10);
    const xml = buildSitemapXml([
      { loc: `${BASE_URL}/industries`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      { loc: `${BASE_URL}/compare`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      ...industryUrls,
      ...competitorUrls,
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  }));

  app.get("/sitemap-blog.xml", asyncHandler(async (_req, res) => {
    const articles = await getBlogArticles();
    const articleUrls = articles.map((a) => ({
      loc: `${BASE_URL}/blog/${a.slug}`,
      lastmod: a.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.7",
    }));
    const xml = buildSitemapXml([
      ...articleUrls,
      { loc: `${BASE_URL}/faq`, lastmod: FAQ_LAST_UPDATED, changefreq: "monthly", priority: "0.8" },
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  }));
}
