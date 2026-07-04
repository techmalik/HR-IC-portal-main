const AXLE_LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 28 28" fill="none" style="display:block;"><circle cx="14" cy="14" r="11.5" stroke="#111827" stroke-width="2"/><circle cx="14" cy="14" r="4" fill="#111827"/></svg>`;

interface SsrShellOptions {
  title: string;
  metaDescription: string;
  canonicalPath: string;
  ogTitle?: string;
  ogDescription?: string;
  jsonLd?: object | null;
  bodyHtml: string;
}

export function ssrHtmlShell(opts: SsrShellOptions): string {
  const {
    title,
    metaDescription,
    canonicalPath,
    ogTitle,
    ogDescription,
    jsonLd,
    bodyHtml,
  } = opts;

  const logoImg = `${AXLE_LOGO_SVG}<span style="font-weight:700;font-size:1rem;letter-spacing:-0.02em;color:#111827;">Axle</span>`;

  const jsonLdScript = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\/script/gi, "<\\/script")}</script>`
    : "";

  const baseUrl = "https://axlehq.app";
  const canonical = `${baseUrl}${canonicalPath}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escAttr(metaDescription)}">
  <link rel="canonical" href="${escAttr(canonical)}">
  <meta property="og:title" content="${escAttr(ogTitle || title)}">
  <meta property="og:description" content="${escAttr(ogDescription || metaDescription)}">
  <meta property="og:url" content="${escAttr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Axle">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(ogTitle || title)}">
  <meta name="twitter:description" content="${escAttr(ogDescription || metaDescription)}">
  ${jsonLdScript}
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: #059669;
      --primary-dark: #047857;
      --bg: #ffffff;
      --bg-muted: #F9FAFB;
      --border: #E5E7EB;
      --text: #111827;
      --text-muted: #6B7280;
      --text-light: #9CA3AF;
      --radius: 8px;
      --max-w: 860px;
    }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      font-size: 16px;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── Header ── */
    .ssr-header {
      background: #fff;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .ssr-header-inner {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ssr-header-logo { display: flex; align-items: center; gap: 10px; text-decoration: none !important; }
    .ssr-header-nav { display: flex; align-items: center; gap: 20px; }
    .ssr-header-nav a { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; }
    .ssr-header-nav a:hover { color: var(--primary); text-decoration: none; }
    .ssr-cta-btn {
      background: var(--primary);
      color: #fff !important;
      padding: 7px 16px;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .ssr-cta-btn:hover { background: var(--primary-dark) !important; text-decoration: none !important; }

    /* ── Main layout ── */
    .ssr-main {
      max-width: var(--max-w);
      margin: 48px auto;
      padding: 0 24px;
    }

    /* ── Breadcrumb ── */
    .ssr-breadcrumb {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 28px;
    }
    .ssr-breadcrumb a { color: var(--text-muted); }
    .ssr-breadcrumb a:hover { color: var(--primary); }
    .ssr-breadcrumb .sep { color: var(--text-light); }

    /* ── Typography ── */
    h1 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; font-size: 2.5rem; line-height: 1.2; margin-bottom: 16px; color: var(--text); }
    h2 { font-size: 1.5rem; font-weight: 600; margin-top: 40px; margin-bottom: 12px; color: var(--text); }
    h3 { font-size: 1.2rem; font-weight: 600; margin-top: 28px; margin-bottom: 8px; color: var(--text); }
    p { margin-bottom: 16px; }
    ul, ol { padding-left: 24px; margin-bottom: 16px; }
    li { margin-bottom: 6px; }
    strong { font-weight: 600; }

    /* ── Meta row ── */
    .ssr-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .ssr-tag {
      background: #ECFDF5;
      color: var(--primary);
      padding: 2px 10px;
      border-radius: 999px;
      font-weight: 500;
    }

    /* ── Table ── */
    .ssr-table-wrap { overflow-x: auto; margin: 24px 0; border-radius: var(--radius); border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { background: var(--bg-muted); font-weight: 600; text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border); }
    td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }

    /* ── Callout ── */
    .ssr-callout {
      background: #ECFDF5;
      border-left: 4px solid var(--primary);
      border-radius: 0 var(--radius) var(--radius) 0;
      padding: 16px 20px;
      margin: 24px 0;
      font-size: 0.9375rem;
    }
    .ssr-callout-warn {
      background: #FFFBEB;
      border-left-color: #D97706;
    }

    /* ── CTA block ── */
    .ssr-cta-block {
      background: #F0FDF4;
      border: 1px solid #A7F3D0;
      border-radius: 12px;
      padding: 32px 36px;
      margin: 48px 0 32px;
      text-align: center;
    }
    .ssr-cta-block h3 { margin-top: 0; font-size: 1.4rem; color: var(--text); }
    .ssr-cta-block p { color: var(--text-muted); margin-bottom: 20px; }
    .ssr-cta-block a.ssr-cta-btn { display: inline-block; font-size: 1rem; padding: 12px 28px; }

    /* ── Related articles ── */
    .ssr-related { margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--border); }
    .ssr-related h3 { margin-top: 0; }
    .ssr-related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
    .ssr-related-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      transition: border-color 0.15s;
    }
    .ssr-related-card:hover { border-color: var(--primary); }
    .ssr-related-card a { color: var(--text); font-weight: 600; font-size: 0.9rem; line-height: 1.4; }
    .ssr-related-card a:hover { color: var(--primary); text-decoration: none; }
    .ssr-related-card .ssr-tag { display: inline-block; margin-top: 8px; }

    /* ── Blog index ── */
    .ssr-blog-grid { display: grid; gap: 28px; margin-top: 32px; }
    .ssr-blog-card {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px 28px;
      transition: box-shadow 0.15s;
    }
    .ssr-blog-card:hover { box-shadow: 0 4px 20px rgba(5,150,105,0.1); }
    .ssr-blog-card h2 { margin-top: 0; font-size: 1.2rem; margin-bottom: 8px; }
    .ssr-blog-card h2 a { color: var(--text); }
    .ssr-blog-card h2 a:hover { color: var(--primary); text-decoration: none; }
    .ssr-blog-excerpt { color: var(--text-muted); font-size: 0.9375rem; margin-bottom: 12px; }
    .ssr-blog-date { font-size: 0.8125rem; color: var(--text-light); }

    /* ── FAQ ── */
    .ssr-faq-section { margin-bottom: 40px; }
    .ssr-faq-section h2 { font-size: 1.3rem; margin-bottom: 16px; }
    details {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 10px;
      background: var(--bg);
    }
    details[open] { background: var(--bg-muted); }
    summary {
      padding: 14px 18px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9375rem;
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '+'; font-size: 1.25rem; color: var(--primary); flex-shrink: 0; }
    details[open] summary::after { content: '−'; }
    .faq-answer { padding: 0 18px 16px; font-size: 0.9375rem; color: var(--text-muted); }

    /* ── Email capture ── */
    .ssr-email-capture {
      background: #F0FDF4;
      border: 1px solid #A7F3D0;
      border-radius: 12px;
      padding: 28px 32px;
      margin: 40px 0;
    }
    .ssr-email-capture h3 {
      margin-top: 0;
      font-size: 1.2rem;
      color: var(--text);
      margin-bottom: 6px;
    }
    .ssr-email-capture p {
      color: var(--text-muted);
      font-size: 0.9375rem;
      margin-bottom: 16px;
    }
    .ssr-email-form {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ssr-email-input {
      flex: 1 1 220px;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.9375rem;
      font-family: inherit;
      color: var(--text);
      background: #fff;
      outline: none;
      transition: border-color 0.15s;
    }
    .ssr-email-input:focus { border-color: var(--primary); }
    .ssr-email-submit {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 10px 22px;
      border-radius: var(--radius);
      font-size: 0.9375rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .ssr-email-submit:hover { background: var(--primary-dark); }
    .ssr-email-success {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: var(--radius);
      padding: 12px 18px;
      color: #166534;
      font-size: 0.9375rem;
      font-weight: 500;
      margin-top: 0;
    }
    .ssr-email-success::before { content: '✓'; font-size: 1.1rem; font-weight: 700; color: #16a34a; }
    .ssr-email-error {
      color: #991b1b;
      font-size: 0.875rem;
      margin-top: 8px;
    }

    /* ── Footer ── */
    .ssr-footer {
      background: var(--bg-muted);
      border-top: 1px solid var(--border);
      padding: 40px 24px;
      margin-top: 80px;
    }
    .ssr-footer-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 32px;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ssr-footer-brand { display: flex; align-items: center; gap: 10px; }
    .ssr-footer-links { display: flex; flex-wrap: wrap; gap: 20px; }
    .ssr-footer-links a { font-size: 0.875rem; color: var(--text-muted); }
    .ssr-footer-links a:hover { color: var(--primary); text-decoration: none; }
    .ssr-footer-copy { font-size: 0.8125rem; color: var(--text-light); width: 100%; margin-top: 16px; }

    /* ── Hero ── */
    .ssr-hero {
      background: #F9FAFB;
      border-bottom: 1px solid var(--border);
      padding: 60px 24px 48px;
      text-align: center;
      margin-bottom: 0;
    }
    .ssr-hero h1 { font-size: 2.75rem; margin-bottom: 12px; }
    .ssr-hero p { color: var(--text-muted); font-size: 1.125rem; max-width: 580px; margin: 0 auto; }

    @media (max-width: 640px) {
      h1 { font-size: 1.75rem; }
      .ssr-hero h1 { font-size: 2rem; }
      .ssr-header-nav .hide-mobile { display: none; }
    }
  </style>
</head>
<body>
  <header class="ssr-header">
    <div class="ssr-header-inner">
      <a href="/" class="ssr-header-logo">
        ${logoImg}
      </a>
      <nav class="ssr-header-nav">
        <a href="/blog" class="hide-mobile">Blog</a>
        <a href="/faq" class="hide-mobile">FAQ</a>
        <a href="/login" class="ssr-cta-btn">Get Started</a>
      </nav>
    </div>
  </header>

  ${bodyHtml}

  <footer class="ssr-footer">
    <div class="ssr-footer-inner">
      <div class="ssr-footer-brand">
        ${logoImg}
      </div>
      <div class="ssr-footer-links">
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
        <a href="/faq">FAQ</a>
        <a href="/login">Login</a>
        <a href="/signup">Sign Up Free</a>
      </div>
      <p class="ssr-footer-copy">&copy; ${new Date().getFullYear()} Axle. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
