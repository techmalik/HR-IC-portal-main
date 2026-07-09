// Regression tests for the P0-2 host-routing rewrite — decideHostRouting()
// is the pure decision core behind the production-only middleware in
// server/index.ts. See docs/audit-implementation-plan.md Phase 0 (P0-2).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideHostRouting,
  APP_HOST,
  MARKETING_APEX_HOST,
  MARKETING_WWW_HOST,
  REPLIT_HOST,
} from "../hostRouting.ts";

test("www canonicalizes to the apex on every path", () => {
  const d = decideHostRouting(MARKETING_WWW_HOST, "/faq");
  assert.deepEqual(d, { kind: "redirect", status: 301, location: `https://${MARKETING_APEX_HOST}/faq` });
});

test("the raw Replit host canonicalizes to the apex", () => {
  const d = decideHostRouting(REPLIT_HOST, "/blog");
  assert.deepEqual(d, { kind: "redirect", status: 301, location: `https://${MARKETING_APEX_HOST}/blog` });
});

test("the raw Replit host still serves the health check directly", () => {
  const d = decideHostRouting(REPLIT_HOST, "/api/health");
  assert.deepEqual(d, { kind: "next" });
});

test("an unknown host (preview URL, custom domain) passes through untouched", () => {
  const d = decideHostRouting("some-preview-abc123.repl.co", "/back-office");
  assert.deepEqual(d, { kind: "next" });
});

test("API and static-asset paths pass through on both canonical hosts", () => {
  for (const host of [APP_HOST, MARKETING_APEX_HOST]) {
    assert.deepEqual(decideHostRouting(host, "/api/users"), { kind: "next" }, host);
    assert.deepEqual(decideHostRouting(host, "/assets/index-abc123.js"), { kind: "next" }, host);
    assert.deepEqual(decideHostRouting(host, "/favicon.ico"), { kind: "next" }, host);
  }
});

test("back-office on the marketing domain forwards to the app subdomain", () => {
  const d = decideHostRouting(MARKETING_APEX_HOST, "/back-office/tenants");
  assert.deepEqual(d, { kind: "redirect", status: 302, location: `https://${APP_HOST}/back-office/tenants` });
});

test("back-office on the app subdomain passes through (own auth cookie)", () => {
  const d = decideHostRouting(APP_HOST, "/back-office/tenants");
  assert.deepEqual(d, { kind: "next" });
});

test("app-shell paths on the marketing domain forward to the app subdomain", () => {
  const d = decideHostRouting(MARKETING_APEX_HOST, "/timesheets");
  assert.deepEqual(d, { kind: "redirect", status: 302, location: `https://${APP_HOST}/timesheets` });
});

test("app-shell prefix routes (e.g. /team/:userId) also forward from marketing", () => {
  const d = decideHostRouting(MARKETING_APEX_HOST, "/team/abc123");
  assert.deepEqual(d, { kind: "redirect", status: 302, location: `https://${APP_HOST}/team/abc123` });
});

test("public/SEO paths on the marketing domain pass through regardless of auth", () => {
  for (const p of ["/", "/login", "/signup", "/faq", "/robots.txt", "/blog", "/blog/some-post"]) {
    assert.deepEqual(decideHostRouting(MARKETING_APEX_HOST, p), { kind: "next" }, p);
  }
});

test("marketing-only SEO paths on the app subdomain canonicalize back to marketing", () => {
  for (const p of ["/faq", "/industries", "/compare", "/robots.txt", "/blog", "/blog/some-post"]) {
    assert.deepEqual(
      decideHostRouting(APP_HOST, p),
      { kind: "redirect", status: 301, location: `https://${MARKETING_APEX_HOST}${p}` },
      p
    );
  }
});

test("competitor-alternative and industry-landing pages canonicalize from the app subdomain", () => {
  assert.deepEqual(decideHostRouting(APP_HOST, "/deel-alternative"), {
    kind: "redirect",
    status: 301,
    location: `https://${MARKETING_APEX_HOST}/deel-alternative`,
  });
  assert.deepEqual(decideHostRouting(APP_HOST, "/contractor-management-for-agencies"), {
    kind: "redirect",
    status: 301,
    location: `https://${MARKETING_APEX_HOST}/contractor-management-for-agencies`,
  });
});

test("root and app-shell paths on the app subdomain require a session check", () => {
  for (const p of ["/", "/timesheets", "/team/abc123"]) {
    assert.deepEqual(
      decideHostRouting(APP_HOST, p),
      { kind: "check-session", loginRedirect: `https://${MARKETING_APEX_HOST}/login` },
      p
    );
  }
});

test("non-app-shell, non-marketing-only paths on the app subdomain pass through untouched", () => {
  // /login and /signup live only in the client's public route set but are
  // reachable on the app subdomain too (e.g. a stale bookmark) — the server
  // must not redirect-loop them.
  for (const p of ["/login", "/signup"]) {
    assert.deepEqual(decideHostRouting(APP_HOST, p), { kind: "next" }, p);
  }
});
