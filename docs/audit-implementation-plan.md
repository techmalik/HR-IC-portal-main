# Axle — Full App Audit & Implementation Plan

_Audit date: 2026-07-08. Branch: `claude/app-audit-backoffice-redirect-nqos6o`._

This document is an implementation plan derived from a full audit of the codebase
(server, data layer, main app client, back-office, marketing/SEO, billing, email,
deployment config). It is ordered by priority: each phase is independently
shippable, and phases 0–2 should ship before anything else.

Conventions used below:

- Every task lists the file(s) and, where useful, current line numbers (valid as
  of commit `ffbd07c`).
- "USER ACTION" = something only the product owner can do (DNS panel, Replit
  secrets). Everything else is code.
- Do not "fix" by adding special cases to the existing host-middleware allowlist
  without also doing P0-2 — the allowlist design is the root cause of two
  separate production incidents (back-office lockout, dead SEO pages).

---

## Phase 0 — Production blockers (ship first, smallest possible diff)

### P0-1 · Back-office login redirect loop (the reported bug)

**Symptom:** `https://app.axlehq.app/back-office/login` 302-redirects to
`https://axlehq.app/login`, so the back-office can never be reached in
production.

**Root cause:** `server/index.ts:132-153`. In production, on `app.axlehq.app`,
every non-API, non-static-asset navigation is checked for a valid **main-app**
`session_token` cookie and redirected to the marketing login when absent. The
back-office uses a completely separate cookie (`bo_session_token`, see
`server/routes.ts:660`) and its own auth context, so `/back-office/login`
itself gets bounced before the SPA loads. The client-side isolation added
earlier (App.tsx:713 `BackofficeSection`) is correct — the server middleware
simply fires first.

**Fix (server/index.ts, app-subdomain branch):**

```ts
const isBackoffice = p === "/back-office" || p.startsWith("/back-office/");
if (!isApiRequest && !isStaticAsset && !isBackoffice) {
  // existing session_token check + redirect
}
```

Back-office pages don't need the server-side session gate: `BackofficeGuard`
(client/src/App.tsx:566) already redirects unauthenticated users to
`/back-office/login`, and every `/api/backoffice/*` route is enforced
server-side by `boAuthMiddleware + requirePlatformAdmin`
(server/routes.ts:729).

**Also in this task:**

- Marketing-domain branch: redirect `GET /back-office*` to
  `https://app.axlehq.app` + same path (302) instead of the homepage, so the
  URL works no matter which host the user types it on.
- `client/src/pages/backoffice-login.tsx:145`: the "Go to main login" anchor
  points at `/login` **on the app subdomain**, which (unauthenticated) bounces
  through the marketing redirect. Point it at the marketing origin explicitly
  (`https://axlehq.app/login` via `getMarketingOrigin()` fallback).

**Acceptance:**
- `curl -sI https://app.axlehq.app/back-office/login` → `200` + HTML (no `Location` header).
- Logging in at that URL with a `PLATFORM_ADMIN_EMAILS` account lands on `/back-office`.
- `curl -sI https://axlehq.app/back-office/login` → `302` → `https://app.axlehq.app/back-office/login`.
- Main app behavior unchanged: `curl -sI https://app.axlehq.app/timesheets` (no cookie) still 302s to the marketing login.

### P0-2 · Host-routing middleware rewrite (kills the whole bug class)

The hand-maintained allowlist in `server/index.ts:106-130` currently 302s these
**public, server-rendered SEO routes** to the homepage on the marketing domain
(they're all registered in `server/routes.ts:6016-6271`):

`/faq`, `/industries`, `/compare`, `/contractor-management-for-:industry`,
`/:slug-alternative`, `/robots.txt`, `/llms.txt`, `/sitemap.xml`,
`/sitemap-blog.xml`, `/sitemap-programmatic.xml`.

That means Google cannot fetch robots.txt or any sitemap on the canonical host —
the entire programmatic-SEO investment is invisible in production.

**Fix — invert the model.** Replace both host branches with:

1. Create `server/hostRouting.ts` exporting a single source of truth:
   - `MARKETING_HOSTS`, `APP_HOST` constants;
   - `APP_SHELL_ROUTES`: the wouter routes of the authenticated app (copy from
     `client/src/App.tsx:666-691`: `/timesheets`, `/invoices`, `/expenses`,
     `/team-*`, `/ooo-requests`, `/leave-requests`, `/overtime-approvals`,
     `/all-timesheets`, `/analytics`, `/evaluations`, `/my-team`, `/team/:id`,
     `/users`, `/roles`, `/billing`, `/activity-logs`, `/profile`,
     `/timesheets-overview`, `/approved-timesheets`, `/dashboard` if any).
2. Marketing host: **only** redirect app-shell paths → `https://app.axlehq.app{path}`
   (302). Everything else (SEO pages, sitemaps, robots, static, API) passes
   through. The SPA already renders only public routes on the marketing host
   (`App.tsx:619-621`), so nothing private can leak.
3. App host: keep the unauthenticated-navigation → marketing-login redirect,
   but scope it to app-shell paths + `/` only, and exempt `/back-office*`
   (P0-1). Redirect marketing-only paths (`/blog*`, `/faq`, sitemaps, etc.)
   301 → `https://axlehq.app{path}` for canonicalization.
4. Host canonicalization (same middleware, before everything else):
   - `www.axlehq.app` → 301 `https://axlehq.app{path}` (see DNS note P0-4).
   - `axle-app.replit.app` → 301 `https://axlehq.app{path}` **except** when the
     request is a Replit health check (`/api/health` should stay reachable on
     every host). Today the Replit host serves the full site with no rules at
     all — duplicate content and an unauthenticated side door past the
     host-based UX rules.

**Acceptance:** curl matrix over the three hosts × (`/`, `/faq`,
`/sitemap.xml`, `/robots.txt`, `/blog`, `/timesheets`, `/back-office/login`)
returns the statuses defined above; no path returns a redirect-to-homepage.

### P0-3 · SEO base URLs are wrong or point to unowned domains

- `server/routes.ts:6188` — `BASE_URL = "https://www.axlehq.app"`; also
  `server/routes.ts:6170` (`llms.txt`), `server/ssrShared.ts:32`,
  `server/seo/blogPages.ts:4`, `server/seo/faqPages.ts:4`,
  `server/seo/programmaticPages.ts`. `www` is not a linked Replit custom
  domain — it doesn't even terminate TLS today. Change all to
  `https://axlehq.app` (define once, e.g. `export const CANONICAL_ORIGIN` in
  `server/ssrShared.ts`, import everywhere).
- `server/spa-meta.ts:1` — `SITE_URL = "https://axle.run"` and the client-side
  canonicals `client/src/pages/landing.tsx:174`, `login.tsx:36`,
  `signup.tsx:42`, `competitive-analysis.tsx:1413` all emit
  **`axle.run`**, a domain the product does not use. Every indexed page
  currently tells Google its canonical home is a foreign domain. Change to
  `https://axlehq.app`.
- `llms.txt` (`routes.ts:6174`) advertises competitor pages as
  `/axle-vs-[competitor]`, the sitemap emits `/${c.slug}` (`routes.ts:6210`),
  and the actual route is `/:slug-alternative` (`routes.ts:6063`). Align all
  three on the real route (ensure competitor `slug` values already end in
  `-alternative`; if they do, fix llms.txt text only).
- robots.txt duplication: server route (`routes.ts:6161`, allow-all) shadows
  `client/public/robots.txt` (disallow `/back-office/`). Keep only the server
  route; make sitemap URLs absolute (`https://axlehq.app/sitemap.xml` …) and
  add `Disallow: /back-office`. Delete `client/public/robots.txt`.
- `og:image` points at files that don't exist (`ssrShared.ts:48` →
  `/og-default.png` missing from `client/public/`; `spa-meta.ts:2` →
  `axle.run/icons/icon-192.png`). Add a real 1200×630 `og-default.png` to
  `client/public/` and reference it from the canonical origin.

### P0-4 · DNS / Replit configuration — **USER ACTIONS** (document, don't code)

From the Namecheap + Replit screenshots:

1. **Delete the `URL Redirect Record` on host `@` → `https://www.axlehq.app`
   (Permanent) in Namecheap.** (DECIDED.) It conflicts with the
   `A @ → 34.111.179.208` record — Namecheap implements URL-redirects via their
   own web-forwarding IP, so the apex has two competing answers and resolution
   is nondeterministic; some visitors get 301'd to `www`, a TLS dead end. The
   apex must be served by the `A @` record alone. Keep the two `TXT @` records,
   `CNAME app → axle-app.replit.app`, and `A @`.
2. **Fix `www` (DECIDED — option b):** delete the `CNAME www → axle-app.replit.app`
   record and add `URL Redirect Record: host=www, value=https://axlehq.app,
   Permanent (301)`. Then `www` cleanly 301s to the apex with no Replit cert
   needed. (Alternative, if you prefer keeping the CNAME: register
   `www.axlehq.app` as a custom domain in Replit so it gets a cert, and let the
   P0-2 middleware 301 it to apex.) Until one of these is done, every `www` URL
   is broken.
3. **Replit secrets (Production deployment):**
   - `PAYSTACK_TEST_API_KEY`: CONFIRMED test-mode — no real money is collected
     yet, by design. Do the P2-1 rename to `PAYSTACK_SECRET_KEY` now (read the
     old name as fallback), and swap in the live `sk_live_…` key later when
     ready to charge. No further action needed until then.
   - Add `FROM_EMAIL` (e.g. `notifications@axlehq.app`, domain verified in
     Resend) — today it falls back to `notifications@resend.dev`
     (`server/emailService.ts:13`), which only delivers to the Resend account
     owner.
   - Add `APP_BASE_URL=https://app.axlehq.app` (used by P2-4 email-link fix).
   - Confirm `RESEND_API_KEY` is set in production (all email is silently
     skipped without it).
4. The `app` CNAME → `axle-app.replit.app` works (Replit shows Verified) even
   though Replit's panel asks for A + TXT records; leave it, but if
   re-verification ever fails, switch to the exact records Replit lists.

---

## Phase 1 — Tenant isolation & security (highest-severity code fixes)

The write/approval paths (timesheet review, invoice review, bulk review) are
well guarded; the reads and creates are not. Storage getters
(`getTimesheetsByUser`, `getDailyEntriesByTimesheet`, `getInvoiceLineItems`,
`getIcResponsibilities`, `getOOORequestsByUser` — `server/storage.ts:302,350,378,514,542`)
are global, so a missing route check = cross-tenant access.

### P1-1 · Add two shared guards (server/routes.ts or new middleware module)

```ts
function assertSameOrg(user: User, entity: { organizationId: string | null }) // 404/403 on mismatch
function assertSelfOrOrgAdmin(user: User, targetUserId: string)               // for ?userId= style reads
```
`checkOrgBoundary` (routes.ts:252-255) currently **fails open** when
`currentUser.organizationId` is null — make it fail closed (platform-admin
bypass only via `PLATFORM_ADMIN_EMAILS`).

### P1-2 · Fix cross-tenant reads (add guard, one line each)

| Endpoint | Line | Problem |
|---|---|---|
| `GET /api/timesheets?userId=` | routes.ts:2012 | no check on `userId` at all |
| `GET /api/timesheets/:id/entries` | routes.ts:2096 | no check; leaks hours + activity log |
| `GET /api/ooo-requests?userId=` | routes.ts:1837 | any supervisor reads any org |
| `GET /api/ooo-requests/approved-dates?userId=` | routes.ts:2674 | none |
| `GET /api/invoices/next-number/:userId` | routes.ts:2838 | none |
| `GET /api/invoices/:invoiceId/line-items` | routes.ts:3160 | none |
| `GET /api/ic-responsibilities/:icId` | routes.ts:3231 | none |
| `GET /api/evaluations/:id`, `/:id/sections` | routes.ts:3758-3787 | no org boundary for admins |
| `GET /api/users/:id/last-evaluation` | routes.ts:3789 | none |
| `GET /api/feedback-invitations?evaluationId=` | routes.ts:4172 | none; leaks emails |
| `GET /api/notifications*` (4 routes) | routes.ts:4259-4312 | `role==="admin"` bypass has no org check |
| `GET /objects/:objectPath(*)` | replit_integrations/object_storage/routes.ts:95 | unlinked objects: `return isAdmin` with no org check |

### P1-3 · Fix cross-tenant / mass-assignment writes

Replace every `{ ...req.body }` spread with an explicit field allowlist (or
`insertXSchema.pick(...)` zod parse) **and** add org/ownership checks:

| Endpoint | Line | Fix |
|---|---|---|
| `PATCH /api/ooo-requests/:id` | 1958 | assertSameOrg + reviewer must be admin/owner or the requester's supervisor; allowlist `{status, reviewNotes}` |
| `POST /api/ooo-requests` | 1923 | force `userId = currentUser.id` (or verified report), force `status: "pending"` |
| `POST /api/timesheets/save`, `/submit` | 2101, 2181 | `userId` must equal caller (or in-org supervisor acting for report); currently anyone can overwrite/delete anyone's entries |
| `POST /api/overtime-requests` | 2527 | force `userId`/`status` |
| `POST /api/invoices` | 2756 | force `userId = caller`; add (userId, month, year) dedup to stop double-create |
| `PATCH /api/invoices/:id` | 2946 | allowlist `{status ∈ approved/rejected/revision_requested, reviewNotes}`; today a supervisor can set `status:"paid"`, `amount`, even `organizationId`, bypassing `mark-paid` (3041) |
| `DELETE /api/invoices/:id` | 2873 | add `assertSameOrg` (any org's admin can delete today) |
| `POST /api/invoices/:invoiceId/line-items` | 3165 | assertSameOrg on parent invoice |
| `POST/PATCH/DELETE /api/ic-responsibilities` | 3236-3258 | supervisor/admin of the IC's org only; set `organizationId` server-side |
| `PATCH /api/evaluation-sections/:id` | 3995 | load parent evaluation, assertSameOrg + role check — today **any authenticated user platform-wide can rewrite any review** |
| `POST /api/evaluations/:id/sections/bulk-update` | 4003 | add org boundary; verify each section belongs to the evaluation |
| `PATCH /api/evaluations/:id` | 3918 | allowlist fields by role (IC transition can't set `overallScore`, `newExperienceLevel`, `managerId`…) |
| `POST /api/evaluations` | 3794 | verify `icId` is in caller's org / direct report |
| `PATCH /api/feedback-invitations/:id` | 4232 | ownership check; allowlist |
| `PATCH /api/organization` | 4427 | allowlist `{name, billingEmail, …}` — not slug/ids |

### P1-4 · Privilege escalation

`PATCH /api/users/:id` (routes.ts:1457-1464) writes `role` from the body for
any admin — a plain admin can promote themselves to `owner` or demote the
owner. Rule: only `owner` may grant/revoke `owner`; admins may only set
`admin`/`ic`; nobody edits their own role.

### P1-5 · Cross-tenant notification/email leak (live data leak)

`server/notificationService.ts:224, 288, 343, 429` call
`storage.getUsersByRole("admin")` with **no org argument** → on every timesheet
submit/approve/reject and invoice upload, admins of **every organization** are
notified (in-app + email) with the contractor's name and amounts. Pass the
subject's `organizationId` (the correct pattern already exists at line 530).
Add a lint-level guardrail: make `organizationId` a **required** parameter on
`getUsersByRole`, `getAllUsers`, `getAllContracts`, etc. (`server/storage.ts:258-346`),
with explicit `"__all__"`-style opt-in for the schedulers in `server/index.ts:225,274`.

### P1-6 · Rate limiting & auth hardening

- `server/index.ts`: add `app.set("trust proxy", true)` (Replit runs behind a
  proxy). Then use `req.ip` in both login limiters (routes.ts:434, 623).
  Today `req.socket.remoteAddress` is the proxy's IP for everyone — 5 failed
  attempts **by anyone** lock out **all users** for 60s, and the limiter is
  useless against a real attacker. Key the limiter on `ip + username`.
- Add rate limiting to `POST /api/auth/register` (routes.ts:516) — org-creation
  spam is unthrottled.
- Raise password minimum from 6 to 10+ chars (routes.ts:523 and the
  user-create/password-change paths).
- Hash session tokens at rest (`server/sessionManager.ts:15-26` stores the raw
  token as the primary key; store `sha256(token)` instead, look up by hash).
- `POST /api/uploads/request-url` (object_storage/routes.ts:69) has no
  authMiddleware — add it or delete the route (it's a legacy stub; the app
  uses the base64 path).
- `migrate-files.ts:31` uses the raw client filename in the storage path
  (`.private/uploads/${originalName}`) — path traversal; sanitize/replace with
  a generated id. (Platform-admin-only, but still.)
- `server/index.ts:64` serves local `uploads/` with no auth and it's on the
  public allowlist — verify nothing sensitive is written there or gate it.

---

## Phase 2 — Billing integrity (revenue is leaking or fake)

### P2-1 · Key + naming

Rename `PAYSTACK_TEST_API_KEY` → `PAYSTACK_SECRET_KEY`
(`server/paystackService.ts:3`, `server/routes.ts:4708`), read the old name as
fallback for one deploy. USER ACTION: put the live key in Replit secrets when
ready (P0-4.3).

### P2-2 · Close the free-upgrade hole

`POST /api/billing/change-plan` (routes.ts:4502-4545) updates the DB plan with
no payment. Restrict it to **downgrades only** (`free`, or lower-tier moves),
and route all upgrades through `POST /api/billing/subscribe`. The client
already only uses it for downgrades (`client/src/pages/billing.tsx:435-437`).

### P2-3 · Subscribe-flow correctness

- `POST /api/billing/subscribe` (routes.ts:4561-4643): guard against an
  existing active `paystackSubscriptionCode` — today re-subscribing creates a
  second live Paystack subscription (double-charge). On upgrade: disable the
  old subscription after the new one is confirmed by webhook.
- Discounts never reach Paystack: `computeNetPrice` (shared/schema.ts:975) is
  display-only; `subscribe` always charges full `PAYSTACK_PRICES`
  (routes.ts:4602-4611). Apply the discount to the amount sent to Paystack, or
  stop displaying discounted prices.
- EUR: `detectCurrencyFromIp` returns EUR (`paystackService.ts:10-24`) but
  Paystack cannot settle EUR — EU users hit an API error at checkout. Map EU →
  USD until a EUR processor exists.
- `/api/billing` (routes.ts:4450-4452) computes prices in USD but the UI
  renders them with the detected currency symbol
  (`billing.tsx:562-585`) — show currency-correct numbers.
- Trial enforcement — see P2-4 (this is now a defined requirement, not a
  question).

### P2-4 · Enforce the 7-day trial as a hard lockout (product decision — CONFIRMED)

**Requirement:** when an org registers it gets 7 days of full free access
(`trialEndsAt` is already set at signup, routes.ts:556-565). After
`trialEndsAt` passes, if the org has **not** subscribed to a paid plan, the
org is locked: logged-in users can do nothing except reach the subscribe/billing
flow and log out. This applies even though free is capped at 3 seats — the point
is a time-boxed trial, not a seat-boxed one.

**Server (authoritative gate):**

- In `authMiddleware` (server/routes.ts:163), alongside the existing
  suspended-org block (routes.ts:181-193), add a trial-expiry block:
  - Compute `isPlatformAdmin` (already done nearby) — platform admins are exempt.
  - Load the org subscription. Treat the org as **locked** when:
    `plan === "free"` AND `trialEndsAt != null` AND `trialEndsAt < now` AND
    `status !== "active-paid"` (i.e. no live `paystackSubscriptionCode`).
  - When locked, allow a small exempt path set and 403 everything else with a
    machine-readable flag so the client can react (mirror the
    `mustChangePassword` pattern at routes.ts:171-177):
    ```ts
    return res.status(403).json({ error: "Trial expired", trialExpired: true });
    ```
  - **Exempt paths** (must stay reachable while locked): `POST /api/auth/logout`,
    `GET /api/auth/me`, `GET /api/billing`, `GET /api/billing/detect-currency`,
    `POST /api/billing/subscribe`, `GET/POST /api/billing/paystack-callback`,
    the Paystack webhook (unauthenticated already), and read-only
    `GET /api/notifications*` if you want the bell to work. Everything else
    (timesheets, invoices, users, evaluations, org writes …) returns the 403.
- Reactivation is automatic: once `subscribe` completes and the webhook sets the
  plan to a paid tier / stores `paystackSubscriptionCode`, the lock condition is
  false on the next request. No manual step.
- Keep the existing seat-add trial checks (routes.ts:1295, 1678) — they become
  redundant but harmless once the global gate exists; simplest to leave them.

**Client (UX):**

- `client/src/lib/queryClient.ts`: the global fetch interceptor already handles
  401. Add a sibling branch: on a 403 whose JSON body has `trialExpired: true`,
  dispatch a `TRIAL_EXPIRED` event instead of treating it as a normal error
  (mirror the `mustChangePassword` handling that already exists on the client).
- `client/src/lib/auth-context.tsx`: surface `trialExpired` on the auth context.
  Cheapest source: `GET /api/auth/me` should include a computed
  `trialExpired` boolean (add it next to `isPlatformAdmin` at routes.ts:720-725,
  and to the `/api/auth/login` response at routes.ts:508-513) so the client
  knows on first load without waiting for a blocked call.
- Render a **blocking, non-dismissible overlay** when `trialExpired` is true
  (same slot/pattern as `ForcePasswordChangeModal`, auth-context.tsx:243-256):
  "Your 7-day trial has ended — subscribe to keep using Axle," with a button to
  `/billing` and a log-out link. Only `/billing` and `/profile`(logout) render
  behind it. Admins/owners see the plan picker; ICs see a "ask your admin to
  subscribe" message (only admin/owner can hit `subscribe`, routes.ts:4561).
- The billing page (`client/src/pages/billing.tsx`) already shows
  `trialExpired`/`daysLeftInTrial` (routes.ts:4488-4493) — reuse that banner.

**Landing copy:** reconcile the two conflicting claims — "7-day free trial"
(landing.tsx:96,277) vs "Free for up to 3 contractors" permanently
(landing.tsx:277,653). With this change the free plan is trial-only (7 days),
so remove the "free forever for 3 contractors" language or make the Free tier
genuinely permanent-but-limited and drop the trial. Pick one; they can't both
be true.

**Acceptance:**
- New org, set `trialEndsAt` to the past in DB → logging in, every app page shows
  the subscribe overlay; direct `curl` to `/api/timesheets` with that cookie →
  `403 {trialExpired:true}`; `/api/billing/subscribe` still works.
- After a successful (test-mode) subscribe, the same cookie can reach
  `/api/timesheets` again.
- Platform-admin account is never locked.

---

## Phase 3 — Data durability & schema

### P3-1 · File-backed stores will lose data on Replit Autoscale (silent, ongoing)

`data/*.json` written at runtime by `server/seo/emailCapture.ts:4`,
`blogStorage.ts:5`, `blogViews.ts:4`, `programmaticStorage.ts:5-6`. Autoscale
filesystems are ephemeral and per-instance: **captured subscriber emails, blog
edits made in the back-office, and view counts disappear on every redeploy and
diverge across instances.** Migrate all four to Postgres tables (drizzle
schema + `npm run db:push`), seeding from the committed JSON. This is a data-loss
bug, not a nice-to-have.

### P3-2 · Schema constraints (single drizzle migration)

- UNIQUE: `subscriptions.organizationId`; `invoices.invoiceNumber` (per org);
  `daily_entries (timesheetId, date)`; `overtime_requests (userId, date)`;
  `users.email`.
- Indexes: `users.email`, `users.managerId`, `subscriptions.organizationId`,
  `subscriptions.paystackCustomerCode`, `ooo_requests.organizationId`,
  `invoices.timesheetId`, `expenses.invoiceId`, `invoice_line_items.organizationId`.
- `organizationId` → `notNull` on all tenant tables (backfill first; shared/schema.ts
  lines 237, 285, 340, 374, 406, 428, 463, 516, 539, 578, 615, 722, 783, 810, 873, 903).
- Replace JS-side `getNextInvoiceNumber` (storage.ts:507-512, race → duplicate
  numbers) with a DB sequence or `count(*)` inside the insert transaction.
- `deleteUser` (storage.ts:253): FK behavior is split cascade/no-action, so
  deleting any contractor with a timesheet throws. Prefer soft-delete
  (`isActive=false` + anonymize) over hard delete.
- `getUnreadNotificationCount` (storage.ts:673) loads all rows to `.length` —
  use SQL `count(*)` (this runs on every 30s poll per user).
- `getSupervisors` (storage.ts:290-295) ignores role and returns **all users**
  — fix the filter (its consumer routes.ts:1195 currently returns everyone as
  a "supervisor").

---

## Phase 4 — Frontend correctness

- **Add a React error boundary** (none exists) wrapping route content, with a
  "reload" action. Then handle the post-deploy lazy-chunk failure: catch
  dynamic-import errors (wrap `lazy()` in a helper that reloads the page once
  on chunk-load failure). Today a deploy mid-session white-screens users.
- **Cache headers** (`server/static.ts`): `index.html` fallback is served with
  no `Cache-Control` — add `no-cache`; serve `/assets/*` with
  `public, max-age=31536000, immutable` (`express.static(distPath, { immutable: true, maxAge: "1y", index: false })`
  plus explicit header on the catch-all). This, not the service worker, is the
  residual stale-code vector.
- **Login drops the deep link in production**: `client/src/pages/login.tsx:60-65`
  ignores `?redirect=` in subdomain mode. Carry it:
  `window.location.href = getAppOrigin() + (validatedRedirectPath || "/")`
  (validate: must start with `/`, not `//`).
- **Logout doesn't clear the query cache** (`client/src/lib/auth-context.tsx:68-76`):
  call `queryClient.clear()` on logout and on the `AUTH_UNAUTHORIZED_EVENT`.
- **Invalidation gaps** (badges stay stale because `staleTime: Infinity`):
  - `overtime-approvals.tsx:70` — also invalidate `["/api/overtime-requests/pending-count"]`;
  - `evaluations.tsx` mutations — invalidate `["/api/evaluations/pending-count"]`;
  - back-office mutations (`backoffice-tenant-detail.tsx:214-215,312-313`) —
    also invalidate `["/api/backoffice/metrics"]`;
  - `backoffice-audit-log.tsx:75-80` builds a single-string dynamic key
    (`.../audit-log?action=…`) that prefix invalidation can't match — use a
    structured key `["/api/backoffice/audit-log", { action, orgId }]` with a
    custom queryFn.
  - Consider lowering global `staleTime` (queryClient.ts:142) to ~30s for
    list/count queries; approval dashboards currently never refresh without a
    full reload.
- **Marketing-host bleed-through**: on `axlehq.app`, `AuthProvider` still
  probes `/api/auth/me` and mounts `ForcePasswordChangeModal` +
  `IdleTimeoutDialog` over the landing page for logged-in users
  (`App.tsx:619-621` vs `auth-context.tsx:243-256`). Skip the probe/modals on
  `isMarketingHost()`.
- **Missing route configs**: add `/expenses` and `/team-expenses` to
  `getRouteConfig` (App.tsx:169-412) — they currently render header "Page";
  delete dead configs `/admin/blog`, `/admin/seo`, `/settings`.
- **Date parsing**: `new Date("yyyy-MM-dd")` is UTC-midnight; comparisons with
  local `now` are off by one near boundaries (`timesheets.tsx:530`,
  `contracts-section.tsx:37`, `leave-requests.tsx:99`; server:
  `routes.ts:2692` uses local `getMonth` while everything else is UTC). Use
  `date-fns/parseISO` + consistent UTC.
- **"Forgot password?"** (`login.tsx:163`) is a styled `<span>` that does
  nothing. Either build reset-by-email (a `sendPasswordResetEmail` already
  exists in `emailService.ts`) or remove the affordance.
- **Contracts upload** (`contracts-section.tsx:74-88`) posts base64 data-URLs
  (~9.3MB JSON for a 7MB file) — switch to the existing presigned-URL flow in
  `use-upload.ts`.

## Phase 5 — Back-office completion

- Sidebar "Billing" (`backoffice-sidebar.tsx:40`) links to
  `/back-office/billing`, which has no route (App.tsx:548-561) and silently
  renders Overview. Either build a billing page or remove the item.
- Tenant drill-down: `GET /api/backoffice/tenants/:orgId` (routes.ts:1155)
  exists but is unused; `backoffice-tenant-detail.tsx` is actually the list.
  Add `/back-office/tenants/:orgId` page (user roster, subscription, discount,
  suspend/reactivate, recent audit entries) using that endpoint.
- `backoffice-logs.tsx` is 100% fabricated data (hardcoded array lines 17-38,
  dead Export button line 84, fake "live" cursor). Replace with real data
  (e.g., recent `activity_logs` + request logs) or delete the page — fake
  observability is worse than none.
- Tickets / Flags / Support pages are "coming soon" stubs — hide them from the
  sidebar until built (a stub named "User Lookup" in an internal tool invites
  support staff to a dead end).
- Audit-log org filter (`backoffice-audit-log.tsx:67-73`): unmatched tenant
  name silently shows ALL logs — show "no match" instead; match on id.
- Update the stale comment `App.tsx:543-544` ("mocked data only" — most pages
  are real now).
- Add pagination to `/api/backoffice/tenants` (routes.ts:993) and audit-log.

## Phase 6 — Marketing site & email

- Footer dead links (`landing.tsx:686-706`): Documentation, Support, About,
  Careers, and **Privacy** are all `href="#"`. Minimum: real Privacy Policy
  and Terms pages (required by GDPR/CCPA and by Paystack/Resend ToS), Support →
  mailto or the support-ticket flow; remove the rest until they exist.
- Email links: `emailService.ts:134-136, 298-300, 475-477` build URLs from
  `REPLIT_DOMAINS` (→ `*.replit.app`, or `#` if unset). Use
  `APP_BASE_URL=https://app.axlehq.app` (P0-4.3) with `REPLIT_DOMAINS` as
  dev fallback.
- Support tickets go to hardcoded `techmaleek@gmail.com`
  (`emailService.ts:435`) — env-var it (`SUPPORT_EMAIL`).
- Add `List-Unsubscribe` header + unsubscribe link (notification emails link to
  settings; blog subscribers need a real one-click unsubscribe before any
  campaign is ever sent — currently none exists).
- ROI calculator hardcodes `$` math (`landing.tsx:598-603`) next to
  currency-localized plan cards — localize or label as USD.
- Password-reset flow (`routes.ts` + `emailService.ts:288-296`): if Resend is
  unconfigured the password is still changed but the email silently isn't sent
  — make the operation atomic (fail the request if the email can't be sent).

## Phase 7 — Architecture & hygiene (as capacity allows)

- Split `server/routes.ts` (6,274 lines, ~130 endpoints) into
  `server/routes/{auth,backoffice,users,timesheets,ooo,overtime,invoices,expenses,evaluations,notifications,billing,organization,seo}.ts`
  plus `server/middleware/auth.ts`. Move the P1-1 guards there.
- Standardize on zod body validation (drizzle-zod insert schemas exist and are
  unused by routes) and `asyncHandler` everywhere (many handlers have no
  try/catch at all).
- Error middleware `server/index.ts:183-189` re-throws after responding —
  remove the `throw err`.
- Delete dead deps (`package.json`): `express-session`, `connect-pg-simple`,
  `memorystore`, `passport`, `passport-local`, `paystack-node` (custom fetch
  client is used), `preact`, plus the leftover Python scaffolding (`main.py`,
  `pyproject.toml`) and the unused GCS object-ACL stack
  (`replit_integrations/object_storage/objectAcl.ts` — its access-group enum
  is empty and always throws).
- `analytics.ts:31-42` hardcoded FX table — document staleness or fetch rates.
- Merge `script/` and `scripts/` directories.
- Tests: there are 3 server test files; add regression tests for P1 (org
  isolation: user A of org 1 cannot read/write org 2's timesheet/invoice/
  evaluation — a simple matrix test over the endpoints in P1-2/P1-3) and for
  the host-routing matrix in P0-2.

---

## Suggested execution order for Sonnet

1. **PR 1 (small, urgent):** P0-1 + P0-3 robots/BASE_URL/canonical strings + P4 cache headers. Unblocks the back-office and stops the SEO bleeding.
2. **PR 2:** P0-2 host-routing rewrite + curl acceptance matrix.
3. **PR 3:** P1-1..P1-4 (isolation guards + mass-assignment allowlists) with the regression test matrix.
4. **PR 4:** P1-5 notification scoping + P1-6 rate limiting/trust proxy.
5. **PR 5:** P2 billing integrity.
6. **PR 6:** P3-1 JSON→Postgres migration, then P3-2 constraints.
7. **PR 7+:** P4 frontend batch, P5 back-office, P6 marketing/email, P7 refactors.

USER ACTIONS to schedule independently: P0-4 DNS changes, Replit secrets
(`PAYSTACK_SECRET_KEY` live key decision, `FROM_EMAIL`, `APP_BASE_URL`,
`SUPPORT_EMAIL`, verify `RESEND_API_KEY`), verify Resend domain, decide the
`www` strategy, and decide trial semantics (P2-3 last bullet).
