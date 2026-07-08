// Single source of truth for the production host-routing rules, replacing
// the hand-maintained allowlists that used to live inline in server/index.ts.
//
// Model: default to passthrough, only redirect the specific paths that need
// it. The old model did the opposite (allowlist public paths, 302-to-home
// everything else on the marketing domain), which silently killed SEO routes
// (robots.txt, sitemaps, /faq, /industries, competitor pages) any time they
// weren't added to the allowlist by hand.

export const APP_HOST = "app.axlehq.app";
export const MARKETING_APEX_HOST = "axlehq.app";
export const MARKETING_WWW_HOST = "www.axlehq.app";
export const REPLIT_HOST = "axle-app.replit.app";

// Paths belonging to the authenticated app shell (the <Switch> rendered by
// ProtectedRoutes in client/src/App.tsx). "/" is deliberately NOT included
// here — it's a dual-purpose route (marketing landing page on the marketing
// host, Dashboard on the app host) that the client already disambiguates via
// isMarketingHost(); the server must not redirect it on either host.
export const APP_SHELL_ROUTES = [
  "/ooo-requests",
  "/ooo-requests/new",
  "/timesheets",
  "/timesheets/current",
  "/invoices",
  "/invoices/upload",
  "/expenses",
  "/team-expenses",
  "/leave-requests",
  "/overtime-approvals",
  "/team-timesheets",
  "/team-invoices",
  "/all-timesheets",
  "/analytics",
  "/evaluations",
  "/my-team",
  "/users",
  "/users/new",
  "/roles",
  "/billing",
  "/activity-logs",
  "/profile",
  "/timesheets-overview",
  "/approved-timesheets",
];

// Dynamic app-shell routes that aren't plain string matches.
const APP_SHELL_PREFIXES = ["/team/"]; // /team/:userId

export function isAppShellPath(path: string): boolean {
  if (APP_SHELL_ROUTES.includes(path)) return true;
  return APP_SHELL_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Server-rendered marketing/SEO routes (registered in server/routes.ts).
// These only make sense on the canonical marketing host — hitting them on
// the app subdomain or the raw Replit host should canonicalize there instead
// of demanding a login.
const MARKETING_ONLY_EXACT = new Set([
  "/faq",
  "/industries",
  "/compare",
  "/robots.txt",
  "/llms.txt",
  "/sitemap.xml",
  "/sitemap-blog.xml",
  "/sitemap-programmatic.xml",
]);
const COMPETITOR_ALTERNATIVE_RE = /^\/[a-z0-9-]+-alternative$/;
const INDUSTRY_LANDING_RE = /^\/contractor-management-for-[a-z0-9-]+$/;

export function isMarketingOnlyPath(path: string): boolean {
  if (MARKETING_ONLY_EXACT.has(path)) return true;
  if (path === "/blog" || path.startsWith("/blog/")) return true;
  if (COMPETITOR_ALTERNATIVE_RE.test(path)) return true;
  if (INDUSTRY_LANDING_RE.test(path)) return true;
  return false;
}

export function isBackofficePath(path: string): boolean {
  return path === "/back-office" || path.startsWith("/back-office/");
}

export function isStaticAssetPath(path: string): boolean {
  return (
    path.startsWith("/assets/") ||
    path.startsWith("/objects/") ||
    path.startsWith("/uploads/") ||
    path === "/favicon.ico" ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|map)$/.test(path)
  );
}

export function isApiPath(path: string): boolean {
  return path.startsWith("/api/");
}
