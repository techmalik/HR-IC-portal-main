# TeamFlow — Repository Audit & Improvement Plan

Audit date: 2026-06-12. Analysis only — no code was modified. All claims cite `file:line` in this repository. Items that could not be fully verified are marked **[unverified]**.

---

## 1. Executive Summary

**Overall health grade: C-.** The product surface is impressively broad (10+ working modules, real-time notifications, PWA/offline support, SSR SEO pages) and the newest code (expenses, bulk-review, notification registry) is genuinely well engineered — but the older 80% of the API surface has systemic authorization holes that make the app unsafe to operate as a multi-tenant SaaS today. The repo's own `threat_model.md` correctly states the rules ("derive reviewer/tenant fields from `req.authenticatedUser`, not the request body" — threat_model.md:43); roughly twenty endpoints violate them.

**Top 3 risks:**
1. **Broken authorization on core workflows** — any authenticated user from *any organization* can approve/reject other people's timesheets, OOO requests, and overtime, read anyone's timesheet entries and invoice line items, and write timesheets *as* other users (details in §3.3).
2. **In-org privilege escalation + account takeover** — an org `admin` can create `owner` accounts due to a one-line ternary bug (routes.ts:586), and any hijacked session can change the account password without knowing the current one (routes.ts:743-754).
3. **Tenancy is fail-open** — a user with a `null` organizationId bypasses every org boundary check (routes.ts:207-209) and storage `getAll*` methods return *all tenants' data* when the org filter is undefined (storage.ts:239-244).

**Top 3 opportunities:**
1. The bulk-review endpoints (routes.ts:3524-3602) and expense review (routes.ts:2614-2669) already implement the correct authorization/transaction pattern — fixing the legacy endpoints is mostly copying an in-repo pattern, not inventing one.
2. Zod schemas already exist in `shared/schema.ts` (drizzle-zod) but are unused for request validation — wiring them in kills the pervasive `...req.body` mass-assignment class in one stroke.
3. Billing/seat infrastructure exists end-to-end except payment collection — connecting Stripe (already a dependency, package.json:87) makes the product monetizable. *(Per owner Decision #1 below, this is deferred: plans will be marked "coming soon" for now.)*

---

## 2. Repo Map

**Purpose:** TeamFlow — multi-tenant SaaS for managing independent contractors: timesheets, leave (OOO), overtime, invoicing, expenses, performance evaluations, contracts, plus a marketing/SEO content engine. Users: org owners, org admins, ICs, and ICs-with-direct-reports ("dynamic supervisors"). Maturity: **functional prototype heading toward production** — built on Replit (`.replit`, `replit.md`, `attached_assets/`), no CI, 3 test files, billing stubbed.

**Stack:** React 18 + TypeScript + Vite + Wouter + TanStack Query + shadcn/Radix + Tailwind (client) · Express 4 + TypeScript ESM (server) · PostgreSQL via Drizzle ORM · cookie sessions (DB-backed tokens, bcrypt-12) · Replit Object Storage · Resend email · `ws` WebSockets.

**Key directories:**

| Path | What it is |
|---|---|
| `server/routes.ts` | **4,516-line god file** — every API route, auth middleware, helpers |
| `server/storage.ts` | DB access layer (`IStorage` + Drizzle impl, 844 lines) |
| `server/index.ts` | Bootstrap, WebSocket auth, 3 in-process schedulers |
| `server/notification*.ts` | Notification registry/transitions/service (the best subsystem; tested) |
| `server/seo/` | SSR blog/FAQ/programmatic pages; **persists to local JSON files** |
| `server/replit_integrations/object_storage/` | File serving + (dead) ACL template code |
| `server/analytics.ts` | Admin analytics — in-memory aggregation over full table scans |
| `shared/schema.ts` | Drizzle schema + Zod insert schemas (909 lines, shared FE/BE) |
| `client/src/pages/` | 30 pages; largest: invoices.tsx (1,792), evaluations.tsx (1,476), users.tsx (1,263) |
| `client/src/lib/` | auth context, query client, offline queue, PWA |
| `data/` | Committed JSON "database" for blog/SEO/subscribers |
| `attached_assets/` | ~25 MB of Replit chat screenshots/PDFs committed to git |
| `main.py`, `pyproject.toml` | Dead Replit-template leftovers (main.py prints "Hello") |

**Entry/flow:** `server/index.ts` → `registerRoutes()` → cookie `session_token` → `authMiddleware` (routes.ts:156-173) attaches `req.authenticatedUser` → per-route ad-hoc checks → `storage` → Postgres. Client: `App.tsx` routes with role gates for *some* admin pages, sidebar-hiding for the rest.

**Surprises found during mapping:**
- A `threat_model.md` exists and is accurate — the code just doesn't follow it.
- Git history shows prior security-fix passes ("Fix three authentication and user access control vulnerabilities") that fixed *some* endpoints and left siblings untouched — there are clearly two generations of route code.
- `stripe` is a dependency but is imported nowhere in the codebase.

---

## 3. Audit Report

### 3.1 Strengths (preserve these)

- **Notification subsystem**: single-source-of-truth registry with compile-time exhaustiveness (`satisfies Record<NotificationTypeValue, …>`), transition mapping, per-category user preferences, and the only meaningful tests in the repo (`server/__tests__/`). *(fact)*
- **Second-generation endpoints are correct**: bulk-review endpoints do org-boundary + team-scoping + status-transition checks inside per-item DB transactions (routes.ts:3537-3575); expense review does the same (routes.ts:2614-2669). *(fact)*
- **Object file serving** authorizes by looking up the owning invoice/contract/expense (object_storage/routes.ts:18-60) — mostly right (see H7 for the gap).
- Field allowlisting exists on user create/update (routes.ts:566-610, 673-713) — the pattern just wasn't applied elsewhere.
- bcrypt-12 hashing applied consistently (storage.ts:220-228); httpOnly + SameSite=Strict + secure-in-prod cookies (routes.ts:326-332).
- Client: clean global 401 handling, debounced autosave with concurrent-save guard (`use-autosave.ts`), offline draft queue, idle-timeout dialog, role-specific onboarding tours.
- SSR HTML generation escapes user content (`escHtml`/`escAttr` in `server/ssrShared.ts`) — no XSS found in blog/SEO rendering.

### 3.2 Severity legend
**Critical** = exploitable now with material damage · **High** = serious hole or data-loss path · **Medium** = quality/scale debt · **Low** = hygiene.

### 3.3 Security — Authorization & tenancy (the ugly part; fix first)

All of these are **verified facts** (code read directly):

| ID | Sev | Finding | Where |
|---|---|---|---|
| C1 | Critical | `PATCH /api/timesheets/:id` — any authenticated user (any org) can approve/reject/modify any timesheet; only self-approval is blocked; `...req.body` allows setting any column | routes.ts:1428-1451 |
| C2 | Critical | `PATCH /api/ooo-requests/:id` — same: no supervisor/team/org check, raw `...req.body` update | routes.ts:1113-1133 |
| C3 | Critical | `PATCH /api/overtime-requests/:id` — self-approval check compares `req.body.reviewedBy === request.userId`, bypassed by omitting `reviewedBy`; no supervisor/org check at all | routes.ts:1641-1666 |
| C4 | Critical | `POST /api/timesheets/save` and `/submit` trust body `userId` — any user can create/overwrite/auto-submit another user's timesheet (cross-org); also deletes + re-inserts entries with **no transaction** | routes.ts:1256-1334, 1336-1426 |
| C5 | Critical | IDOR reads, zero ownership checks: timesheets by arbitrary `?userId` (routes.ts:1170-1179), timesheet entries (1251-1254), invoice line items GET/POST (2180-2196), ic-responsibilities full CRUD (2251-2279), anyone's last evaluation (2772-2775) | routes.ts |
| C6 | Critical | **Role escalation**: comment says "Only owners can set a role" but `(owner && requestedRole) ? requestedRole : (requestedRole \|\| "ic")` resolves to `requestedRole` for *any* admin → admin can mint `owner`/`admin` accounts | routes.ts:585-586 |
| C7 | Critical | **Password change without current password**: `currentPassword` verified only "if provided" — hijacked session → permanent account takeover; also bypasses any notion of admin-forced flow | routes.ts:743-754 |
| C8 | Critical | **Tenancy fail-open**: `checkOrgBoundary` returns `true` when caller's `organizationId` is null (routes.ts:207-210); `storage.getAllUsers/Timesheets/Invoices/OOO(undefined)` return **all tenants** (storage.ts:239-244 et al.); every call site passes `organizationId ?? undefined` | server-wide |
| C9 | Critical | **Confidential competitor battlecard shipped to every authenticated user** — pricing strategy, weaknesses, sales tactics in client bundle; route has no role gate (App.tsx:539-541); PDF footer literally says "Confidential strategy doc" | client/src/data/competitorData.ts; client/src/pages/competitive-analysis.tsx |
| H1 | High | `PATCH /api/invoices/:id` approval requires only `hasSupervisorPrivileges` — *any* supervisor in *any* org can approve/reject any org's invoices (no team/org scoping); `...req.body` mass assignment | routes.ts:1952-1990 |
| H2 | High | `POST /api/invoices` doesn't check body `userId` against the caller; `...req.body` lets the caller set arbitrary columns (amount, status is overwritten, but timesheetId linking is trusted) | routes.ts:1807-1830 |
| H3 | High | Timesheet unlock: supervisor-of-*anyone* can unlock any org's approved timesheet | routes.ts:1472-1502 |
| H4 | High | `POST /api/ooo-requests` spreads `...req.body` — submitter can create a request pre-set to `status: "approved"` | routes.ts:1087 |
| H5 | High | `POST /api/uploads/request-url` has **no auth middleware** — unauthenticated path probing | object_storage/routes.ts:69-93 |
| H6 | High | Admin notification access (`role === "admin"`) has no org boundary — any org's admin can read any user's notifications/preferences cross-org | routes.ts:3195, 3214, 3248, 3298, 3327 |
| H7 | High | Object files not matched to invoice/contract/expense fall back to `return isAdmin` with no org check — cross-tenant read of unlinked files (e.g. migrated/avatar objects) for any admin | object_storage/routes.ts:59 |
| H8 | High | Evaluation list for admins accepts arbitrary `icId`/`managerId` with no org check | routes.ts:2710-2716 |
| H9 | High | Login rate limit keyed on `req.socket.remoteAddress` with no `trust proxy` — behind Replit's proxy all clients share one IP: 5 wrong attempts/min by *anyone* locks out *everyone* (DoS), and per-attacker limiting is void | routes.ts:116-140, 276-281 |
| M1 | Medium | Password policy: 6-char minimum, no complexity/breach checks (routes.ts:345, 744); no self-service password reset (admin-only at routes.ts:955) |
| M2 | Medium | Session tokens stored plaintext in DB (sessionManager.ts:13-19); no rotation; fixed 24 h |
| M3 | Medium | No helmet/security headers; no CSRF tokens (mitigated by SameSite=Strict); 10 MB JSON body limit invites memory abuse (index.ts:54-62) |
| M4 | Medium | Default seed credentials `"ChangeMe123!"` (seed.ts:18) — mitigated by `mustChangePassword`, but the client force-change modal is soft (server-side gate at routes.ts:164-170 is good; client modal can be bypassed visually) |
| M5 | Medium | `/uploads` served statically with no auth (index.ts:64) — **[unverified]** whether legacy local files exist there in production |

### 3.4 Correctness & feature integrity

| ID | Sev | Finding | Where |
|---|---|---|---|
| C10 | Critical (feature) | **Presigned upload flow is broken**: client PUTs to `data.uploadURL` (use-upload.ts:11, 92, 126, 184) but server returns only `{storagePath, objectPath, metadata}` — no `uploadURL` field (object_storage/routes.ts:84-88). Every `useUpload`/`ObjectUploader` consumer fails; invoices work only because they bypass this via base64-in-JSON (routes.ts:1865-1877) |
| H10 | High | No transactions on multi-step writes: timesheet save deletes all entries then re-inserts one-by-one (routes.ts:1278-1305) — a crash mid-loop silently destroys a month of data; invoice-create + timesheet-auto-submit not atomic (routes.ts:1830-1847) |
| H11 | High | Error middleware re-throws after responding (`throw err;` index.ts:100) — at best double-logs, at worst kills the process on async paths |
| H12 | High | Blog/SEO/subscriber data persisted via `fs.writeFileSync` to `data/*.json` (server/seo/blogStorage.ts, programmaticStorage.ts, emailCapture.ts) — lost on every redeploy of an ephemeral container |
| H13 | High | Email delivery is fire-and-forget inside `setImmediate` with errors swallowed (notificationService.ts:129-144) — no retry, no delivery record |
| M6 | Medium | Supervisor evaluation listing bug: supervisors have `role === "ic"` so `GET /api/evaluations` returns *only their own* evaluations (routes.ts:2705-2708) — the manager review workflow likely depends on client workarounds **[unverified against all client call sites]** |
| M7 | Medium | `getSupervisors()` returns **all org users**, not supervisors (storage.ts:271-276) — misleading name, wrong data for any consumer expecting supervisors |
| M8 | Medium | Billing is a stub: `change-plan` flips DB fields with no payment (routes.ts:3409-3452); Stripe dependency unused; Enterprise "Contact Sales" disabled (billing.tsx:291) |
| M9 | Medium | Client query-key drift: `["/api/invoices", {userId}]` vs `["/api/invoices"]` are distinct caches; mutations invalidate one and not the other → stale lists (invoices.tsx:118 vs team-invoices.tsx:86) |
| M10 | Medium | Offline queue supports only `"timesheet" \| "ooo"` (offline-queue.ts:4-11) — offline invoice/expense submissions are dropped |
| L1 | Low | Notification deep links are string-built query params with no existence validation (notification-bell.tsx:15-36) |

### 3.5 Architecture & code quality

- **God file**: `server/routes.ts` (4,516 lines) holds auth, rate limiting, helpers, and ~120 endpoints across 14 domains. *(fact)* Highest-leverage refactor target in the repo.
- **Two generations of code**: legacy single-item endpoints (no authz) vs. new bulk/expense endpoints (correct). The codebase already contains its own target pattern. *(judgment, well-supported)*
- **Duplication**: `timesheets/save` vs `/submit` are ~95% identical 80-line blocks (routes.ts:1256-1334 vs 1336-1426); 5 bulk-review endpoints are near-clones (routes.ts:3524-3970); per-row user-enrichment `Promise.all` blocks repeated 6+ times; client invoice card/status/currency logic duplicated between invoices.tsx and team-invoices.tsx. *(fact)*
- **Client complexity hotspots**: invoices.tsx (1,792 lines) mixes data fetching, two upload paths, PDF generation, payment-detail forms, and rendering; evaluations.tsx (1,476) similarly. *(fact)*
- **Validation gap as architecture**: `shared/schema.ts` exports drizzle-zod insert schemas, but routes parse nothing — every `req.body` is hand-destructured or spread. *(fact)*

### 3.6 Performance

- **N+1 enrichment**: lists fetch rows then call `storage.getUser()` per row inside `Promise.all` (routes.ts:1018-1027, 1183-1192, 1218-1227, 1784-1802, …). With 200 contractors that's 200 extra queries per list render. *(fact)*
- **Scheduler N+1 / cross-tenant scans**: timesheet reminder loads **all users in all orgs**, then per-user fetches the timesheet *and the user's entire notification history* just for idempotency (index.ts:186-207); contract check is getAllContracts + getUser per contract (index.ts:137-148). *(fact)*
- **Analytics** loads full tables into memory and aggregates in JS (server/analytics.ts, e.g. getSpend) — fine to ~50k rows, then a wall. *(fact, scale judgment)*
- **Files in memory**: base64 uploads through JSON, full-buffer downloads (`downloadAsBytes`, object_storage/routes.ts:114-116). *(fact)*
- **Unbounded `loginAttempts` Map** (routes.ts:116) — slow memory leak. *(fact)*

### 3.7 Testing

Three server test files, all good quality (assert behavior, not just execution): notification registry exhaustiveness, emit-with-preferences flows, bulk parsing/partial-failure semantics. **Zero tests** for: authorization (the broken area), storage, analytics (928 lines), any route handler, any client code. No CI — nothing runs `tsc` or tests on push. *(fact)*

### 3.8 Dependencies & repo hygiene

- `stripe` (package.json:87) and `passport`/`passport-local` (74-75), `express-session`/`connect-pg-simple`/`memorystore` (58, 65, 71), `multer` (72), `qs`, `preact` — **imported nowhere I could find**; the session stack was replaced by the custom sessionManager. Dead weight + audit surface. *(fact for stripe/passport; spot-checked others)*
- Heavy `overrides` block (package.json:122-140) pinning transitive CVEs — good instinct, but suggests `npm audit` pressure; lockfile is committed (good).
- ~25 MB `attached_assets/` of chat screenshots + one user PDF with a person's name committed to git history (attached_assets/d72bd41d…Yuliya….pdf). `data/*.json` runtime files committed. `main.py`/`pyproject.toml` dead. Duplicate `script/` and `scripts/` dirs. *(fact)*

### 3.9 DevEx, ops, docs

- No CI, no linter/formatter config, no `.env.example`. Logging is `console.*` with no levels or request IDs. No error reporting (Sentry etc.). Deployment story is Replit-implicit.
- README is accurate on stack but stale on roles (omits `owner`, multi-tenancy) and env vars (missing `PLATFORM_ADMIN_EMAILS`, `DEFAULT_ADMIN_*`); `replit.md` is the better doc. `design_guidelines.md`, `competitor-monitoring.md`, `docs/pillar-content-plan.md` are marketing-process docs living in the code repo.

### 3.10 Module-by-module feature review (what each does vs. what it should)

| Module | What it actually does today | Verdict & needed improvement |
|---|---|---|
| **Auth/signup** | Self-serve org signup → owner + free 3-seat sub; login w/ in-memory rate limit; forced password change flag | Works. Needs: real rate limiting (H9), password reset via email (M1), email verification, min-12 passwords |
| **Timesheets** | Calendar entry + autosave, auto-creates overtime requests >8h/weekends, submit locks, supervisor unlock w/ note, invoice coupling | Core UX is good. Write authz broken (C4), no transactions (H10), save/submit duplication |
| **OOO / Leave** | IC submits, supervisor approves; teammate-conflict detection; approved dates block timesheet entry | Workflow sound; approval authz broken (C2, H4) |
| **Overtime** | Auto-generated from timesheet entries; approval caps hours; rejection resets entry to 8 h and recalcs totals | Clever design; approval authz broken (C3); the reject-recalc runs outside a transaction |
| **Invoices** | Upload (base64) or auto-generate PDF (jsPDF w/ bank details); review/revision loop coupled to timesheet status; mark-paid | Feature-rich; review scoping broken (H1), creation spoofable (H2), upload flow broken (C10), client duplication (M9) |
| **Expenses** | Submit w/ receipt, manager review, link to invoice | **Best module** — correct authz, status transitions, transactions. Use as the template |
| **Evaluations** | 7-level framework, IC self-assessment → manager review → finalize; peer feedback invitations | Ambitious; supervisor listing bug (M6), cross-org reads (H8), 1,476-line component needs decomposition |
| **Contracts** | Admin uploads, expiry/notice-period alerts via daily scheduler | Works; scheduler N+1; alert idempotent via `noticeAlertSentAt` (good) |
| **Billing** | Displays plan/seats; "change plan" writes DB only | **Not monetizable** (M8). Decision #1: mark paid plans "coming soon" and block server-side |
| **User management** | CRUD, CSV bulk import, batch edit, suspend, admin password reset | Functional; role escalation (C6), email-uniqueness check loads all users into memory (routes.ts:557-558) |
| **Notifications** | In-app + email + WebSocket push, per-category prefs, grouped bell w/ deep links | Strongest subsystem; email reliability (H13), cross-org admin reads (H6) |
| **Profile / payment details** | Self-edit, avatar, IBAN/SWIFT storage | Works; payment details stored plaintext — consider encryption-at-rest column level **[judgment]** |
| **Analytics** | Spend/hours/overtime/OOO/SLA/headcount + CSV export, admin-only | Correctly gated; in-memory aggregation won't scale (§3.6) |
| **Landing/SEO/blog** | SSR landing, blog CMS, programmatic competitor/industry pages, FAQ, sitemaps, platform-admin gate via env allowlist | Solid SEO engineering; JSON-file persistence loses data (H12) |
| **Competitive analysis page** | Internal strategy doc + PDF export, visible to all logged-in users | **Remove from client bundle**, gate to platform admins (C9, Decision #3) |
| **PWA/offline** | Service worker, install hint, offline queue for timesheets/OOO | Good foundation; extend queue (M10) |

---

## 4. Improvement Strategy

### Theme 1 — Authorization is per-endpoint folklore; make it structural
**Target state:** every mutating endpoint derives actor/reviewer/tenant from `req.authenticatedUser`; every entity access passes an ownership/team/org guard; storage layer refuses unscoped tenant-wide reads (make `organizationId` a required parameter of `getAll*`, fail closed on null).
**Principle:** authorization lives in one place per resource (a `canReview(user, entity)` helper), not re-derived ad hoc. The bulk-review endpoints are the in-repo reference implementation.

### Theme 2 — No input validation layer; adopt the Zod schemas that already exist
**Target state:** a `validateBody(schema)` middleware on every POST/PATCH using `shared/schema.ts` insert schemas (extended with route-specific picks); zero `...req.body` spreads into storage calls.
**Principle:** parse, don't validate-by-hand; the client never chooses `status`, `reviewedBy`, `userId`, or `organizationId`.

### Theme 3 — Monolith files block safe change
**Target state:** `server/routes/` split by domain (auth, users, timesheets, ooo, overtime, invoices, expenses, evaluations, contracts, notifications, billing, admin-content), each importing shared guards; client pages >800 lines decomposed into feature components.
**Principle:** a security reviewer must be able to read one resource's full policy on one screen.

### Theme 4 — Reliability of side effects (email, files, multi-step writes)
**Target state:** multi-step writes in `db.transaction`; email through a DB-backed outbox with retry; blog/SEO/subscriber data in Postgres; the presigned upload path actually works (or is consciously replaced by authenticated multipart upload).

### Theme 5 — Product completeness decisions
Billing/Stripe, competitive-analysis page audience, password reset, and Replit-vs-elsewhere hosting were product decisions — now resolved, see §6 Decisions.

### Explicitly NOT recommended now (trade-offs)
- **No microservices/queue infrastructure** — in-process schedulers are fine at this scale once their N+1s are fixed.
- **No analytics rewrite to SQL aggregation yet** — current org sizes (seat caps ≤50) keep in-memory viable; revisit at >5k timesheets/org.
- **No test-coverage-% targets across the codebase** — only targeted authz/workflow tests; broad coverage of shadcn UI wrappers is wasted effort.
- **Don't migrate off wouter/TanStack/shadcn** — conventions are consistent and healthy.
- **Don't hash session tokens yet** (M2) — real but lower-payoff; schedule after Criticals.

### Definition of done (measurable)
1. Zero Critical findings: every endpoint in §3.3 has an explicit authz test proving the 403.
2. CI exists and fails on `tsc` errors and failing tests; the authz test suite runs on every push.
3. `grep -rn '\.\.\.req\.body' server/` returns 0 results in storage-bound writes.
4. `storage.getAll*` cannot be called without an `organizationId` (compile error).
5. `routes.ts` < 300 lines (composition only); no client page > 900 lines.
6. Blog/SEO/subscriber writes hit Postgres; a container restart loses nothing.
7. Email sends recorded in an outbox table with status; failed sends visible.

---

## 5. Task Plan

### Milestone 0 — Safety net (do before touching behavior)

| # | Task | Files | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 0.1 | **CI pipeline**: GitHub Actions running `npm ci`, `tsc`, `npm test` on push/PR | `.github/workflows/ci.yml` | Red X on type or test failure | S | None | — |
| 0.2 | **Authz regression harness**: supertest (or node:test + fetch against a test server) with seeded two-org fixture (org A user, org A admin, org A supervisor, org B user); table-driven cases asserting 403s for every §3.3 endpoint. Write them now — they fail — and flip to green as M1 lands | `server/__tests__/authz.test.ts`, test seed helper | Each C1–C8/H1–H8 endpoint has at least one failing-then-passing case | L | Low | 0.1 |
| 0.3 | **DB snapshot/backup routine documented** + verify `npm run db:push` against a scratch DB (documentation-only priority per Decision #2 — no production data exists) | README/docs | Restore tested once | S | None | — |

### Milestone 1 — Critical security & correctness

| # | Task | Files | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 1.1 | **Fix approval authz on legacy endpoints** (C1–C3, H1, H3): port the bulk-review guard (org boundary → team membership or admin → status transition) into `PATCH timesheets/:id`, `PATCH ooo-requests/:id`, `PATCH overtime-requests/:id`, `PATCH invoices/:id`, `POST timesheets/:id/unlock`. Replace `...req.body` with explicit `{status, reviewNote}` allowlist; always set `reviewedBy = currentUser.id`. Per Decision #5, reviewers may ONLY transition status (approve / send back) — never modify entries, hours, or totals | routes.ts:1113, 1428, 1641, 1952, 1472 | 0.2 cases green; client flows still work | M | Medium (could 403 legitimate flows — mirror bulk logic exactly) | 0.2 |
| 1.2 | **Fix IDOR reads/writes** (C4, C5): timesheets save/submit force `userId = currentUser.id` — strictly owner-only, NO supervisor branch (Decision #5); add owner/team/admin+org guards to timesheet list/entries, line-items, ic-responsibilities, last-evaluation, invoices/next-number | routes.ts:1170, 1251, 1256, 1336, 1889, 2180-2196, 2251-2279, 2772 | 0.2 cases green | M | Medium | 0.2 |
| 1.3 | **Fix role-escalation ternary** (C6): non-owners can only create `ic` (or reject the request); add test | routes.ts:586 | Admin creating `owner` → 403 | S | Low | 0.2 |
| 1.4 | **Require current password for self-change** (C7): mandatory unless `mustChangePassword` is set or caller is an admin resetting another user | routes.ts:743-754 | Self-change w/o currentPassword → 401 | S | Low | 0.2 |
| 1.5 | **Tenancy fail-closed** (C8): `checkOrgBoundary` returns false on null org; make `organizationId` required in `getAll*` signatures; assign the seeded org-less admin an organization (per Decision #2, no production data exists — no migration plan needed) | routes.ts:207-210, storage.ts, seed.ts | Compile-enforced; org-less account sees nothing tenant-wide | M | Low (dev-only data, per Decision #2) | 0.2 |
| 1.6 | **Gate competitive-analysis to platform admins** (C9, per Decision #3): delete `competitorData.ts` from the client bundle; serve the data from a `requirePlatformAdmin` API; gate the route | client/src/data/competitorData.ts, App.tsx:539, pages/competitive-analysis.tsx | Strategy data absent from built JS bundle; non-platform-admins → 403 | S | Low | — |
| 1.7 | **Repair the upload flow** (C10, H5): add `authMiddleware` to `request-url`; switch to authenticated multipart upload reusing migrate-files plumbing (preferred over Replit-sidecar presigning per Decision #4 — hosting portability); then migrate invoice upload off base64 | object_storage/routes.ts:69-93, use-upload.ts, invoices.tsx | File upload works E2E; unauthenticated request-url → 401 | L | Medium | — |
| 1.8 | **Fix login rate limiting** (H9): `app.set('trust proxy', 1)` + key on `req.ip`+username, or adopt `express-rate-limit`; cap map size | routes.ts:116-140, index.ts | One attacker can't lock out other users; limit survives proxy | S | Low | — |
| 1.9 | **Error handler**: remove `throw err` after responding; log instead | index.ts:95-101 | No rethrow; 500s logged once | S | Low | — |
| 1.10 | **Org-scope admin notification/preference access** (H6) and evaluation queries (H8) | routes.ts:3195-3327, 2710-2716 | Cross-org admin read → 403 | S | Low | 0.2 |
| 1.11 | **Billing "coming soon"** (M8, Decision #1): mark paid plans "Coming soon" in billing UI, disable upgrade buttons, and reject paid-plan changes in `POST /api/billing/change-plan` server-side | routes.ts:3409-3452, billing.tsx | Paid-plan change → 400; UI shows coming-soon | S | Low | — |

### Milestone 2 — High-leverage structural work

| # | Task | Files | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 2.1 | **Zod request-validation middleware**: `validateBody(schema)` wrapping drizzle-zod insert schemas; apply to all POST/PATCH; delete remaining `...req.body` spreads | new server/middleware/validate.ts; routes | DoD #3; invalid bodies → 400 with field errors | L | Medium | 1.1, 1.2 |
| 2.2 | **Split routes.ts by domain** into `server/routes/*.ts` + shared `server/auth/guards.ts` (`requireRole`, `requireSupervisorOf`, `requireSameOrg`, `asyncHandler`); pure file moves after M1 logic is settled | routes.ts → ~14 modules | routes.ts <300 lines; tests green | L | Medium (merge-conflict heavy — schedule when no parallel work) | M1 |
| 2.3 | **Transactions for multi-step writes**: timesheet save/submit (entry replace + OT requests), invoice-create + timesheet-submit, overtime-reject recalc; extract shared `saveTimesheetEntries()` to kill the save/submit duplication | routes/timesheets, invoices | Kill -9 mid-save leaves consistent data; duplication removed | M | Medium | 2.2 |
| 2.4 | **Email outbox**: `email_outbox` table; notificationService writes a row; small interval worker sends w/ retry+backoff; admin-visible failure state | notificationService.ts:129-144, schema.ts, new worker | DoD #7 | M | Low | — |
| 2.5 | **Move blog/SEO/subscribers to Postgres** (H12): 4 tables + one-time import of `data/*.json`; delete fs persistence; gitignore `data/` | server/seo/*Storage.ts, emailCapture.ts, schema.ts | Restart loses nothing; JSON files gone from runtime path | M | Low | — |
| 2.6 | **Fix scheduler & list N+1s**: batch user lookup (`getUsersByIds`), reminder idempotency via direct `(userId, type, entityId)` query or unique index, JOIN-based enrichment for the 6 list endpoints | index.ts:127-223, routes lists, storage.ts | Reminder run does O(orgs + due users) queries, not O(users × notifications) | M | Low | 2.2 |
| 2.7 | **Security headers + proxy config**: helmet, `trust proxy`, drop JSON limit to 1 MB once base64 uploads are gone | index.ts | Headers present; large-body abuse capped | S | Low | 1.7 |
| 2.8 | **Dependency prune**: remove stripe (per Decision #1, not wiring now), passport*, express-session, connect-pg-simple, memorystore, multer (if unused after 1.7), qs, preact; `npm audit` clean | package.json | Build green; bundle smaller | S | Low | 1.7 |

### Milestone 3 — Quality & polish

| # | Task | Effort | Notes |
|---|---|---|---|
| 3.1 | ~~Billing decision~~ — resolved as task 1.11 (Decision #1) | — | Moved to M1 |
| 3.2 | Decompose invoices.tsx / evaluations.tsx / users.tsx into feature components; extract shared `InvoiceCard`, `STATUS_COLORS`, currency formatting into `lib/` | L | Pure refactor; do after 2.x API stabilization |
| 3.3 | Standardize React Query keys + post-mutation invalidation map (fixes M9 stale lists) | M | |
| 3.4 | Extend offline queue to invoices/expenses (M10); surface swallowed client fetch errors as toasts (invoices.tsx:261-266, auth-context.tsx:167) | M | |
| 3.5 | Fix `getSupervisors()` to actually return supervisors (M7); fix supervisor evaluation listing (M6) | S | Verify client expectations first |
| 3.6 | Self-service password reset via Resend; raise password minimum to 10–12; optional email verification | M | |
| 3.7 | Hash session tokens at rest; sliding expiration | S | |
| 3.8 | Repo hygiene: delete `main.py`/`pyproject.toml`/duplicate `script/`; purge `attached_assets/` from git history (approved, Decision #6 — run `git filter-repo` as a standalone coordinated step) and gitignore it; gitignore `data/`; add `.env.example`; update README (roles, env vars, owner concept) | S | History rewrite needs force-push to main |
| 3.9 | Structured logging (pino) with request IDs; basic error reporting | M | |
| 3.10 | Eval module UX: decompose page, add manager/IC rating divergence view; notification deep-link validation (L1) | L | Product input useful |

### Quick wins (high impact, S effort — can all ship day one)
- 1.3 role-escalation one-liner (routes.ts:586)
- 1.4 require current password (routes.ts:743)
- 1.6 pull competitor battlecard from the bundle
- 1.8 trust proxy + rate-limit fix
- 1.9 remove `throw err` (index.ts:100)
- 1.11 billing coming-soon server-side block
- 3.8 delete `main.py`/`pyproject.toml`, gitignore `data/`
- Add `authMiddleware` to `/api/uploads/request-url` (part of 1.7, separable)

### Implementation sketches — top 3 tasks

**1.1 + 1.2 Legacy endpoint authorization (the big one)**
Approach: extract the proven bulk-review checks into reusable guards before touching anything:
```ts
// server/auth/guards.ts
export function sameOrg(user: User, entity: {organizationId: string|null}): boolean // FAIL CLOSED on null
export async function canReviewFor(user: User, ownerId: string): Promise<boolean>
  // admin/owner of same org → true; else owner ∈ getUsersBySupervisor(user.id)
```
Steps: (1) write guards + unit tests; (2) write the 0.2 supertest table (expect failures); (3) endpoint by endpoint: load entity → 404 → `sameOrg` 403 → role/team check 403 → status-transition check 400 → explicit field allowlist → update. Gotchas: timesheet save/submit are owner-only by decision — the client sends `user.id` (timesheets.tsx), so locking to self is safe; OOO PATCH is used by the *requester* to cancel — keep an owner-can-cancel-pending branch; don't break the invoice↔timesheet coupling side effects, they're correct.

**2.1 Zod validation middleware**
Approach: `const validate = <T>(schema: ZodSchema<T>) => (req,res,next) => { const r = schema.safeParse(req.body); if(!r.success) return res.status(400).json({error: fromZodError(r.error).message}); req.validatedBody = r.data; next(); }` (`zod-validation-error` is already a dependency). Derive per-route schemas from `shared/schema.ts` inserts with `.pick()`/`.omit()` — *always omit* `userId`, `organizationId`, `status`, `reviewedBy`, then have handlers inject those server-side. Gotcha: client sends some numbers as strings (month/year query params and some bodies) — use `z.coerce.number()` where needed; roll out route-by-route behind the 0.2 tests, not big-bang.

**2.2 routes.ts split**
Approach: one domain at a time: create `server/routes/timesheets.ts` exporting `registerTimesheetRoutes(app)`; cut-paste handlers unchanged; move shared helpers (`asyncHandler`, `normalizeFileUrl`, `isWeekend`, currency allowlist) to `server/lib/`. Order: smallest domain first (organization/billing) to prove the pattern, biggest (invoices) last. Gotchas: route registration order matters for `/api/notifications/count` vs `/api/notifications/:userId` (routes.ts:3209-3254) and the SEO catch-alls that must precede the SPA fallback (routes.ts:3454-3456) — preserve registration order explicitly in the composition root; the dynamic `import()`s of SEO modules can become static imports inside the new module.

---

## 6. Decisions from the owner (2026-06-12) — binding for implementation

The original open questions were answered by the project owner. Implementers must follow these:

1. **Billing → "coming soon."** Do NOT wire Stripe now. Task 1.11: mark paid plans as "Coming soon" in the billing UI, disable the upgrade buttons, and make `POST /api/billing/change-plan` (routes.ts:3409) reject changes to paid plans (e.g. 400 "Plan upgrades are coming soon") so the free upgrade hole is closed server-side. Keep the seat-limit enforcement as is. Remove the unused `stripe` dependency (task 2.8).
2. **No production environment exists yet — everything is development.** Consequences: tenancy fail-closed (task 1.5) can land without a data backfill/migration plan; the seeded org-less admin should simply be assigned an organization (or listed in `PLATFORM_ADMIN_EMAILS`) as part of the change; breaking-change caution flags on M1 tasks are relaxed — correctness over compatibility. M0.3 (backup routine) drops to documentation-only priority.
3. **Competitive-analysis page → platform-admin only.** Implement task 1.6 as: remove `competitorData.ts` from the client bundle, serve the data from an API behind `requirePlatformAdmin` (routes.ts:192), and gate the `/competitive-analysis` route to platform admins. Do not delete the feature.
4. **Hosting undecided (Replit or elsewhere); changes are being made via Claude/Codex agents.** Keep the code hosting-portable: task 2.5 (JSON → Postgres) stays HIGH priority since ephemeral disk can't be relied on either way; for task 1.7 prefer the authenticated multipart upload path over Replit-sidecar presigning so the upload flow survives a host move; avoid adding new Replit-specific dependencies.
5. **Timesheet editing is strictly owner-only.** Supervisors may only approve or send back (reject/unlock) — never edit. Task 1.2 therefore locks `POST /api/timesheets/save` and `/submit` (routes.ts:1256, 1336) to `userId === req.authenticatedUser.id` with no supervisor branch, and task 1.1's review guards must not permit supervisors to modify entries or totals — only `{status, reviewNote}` transitions.
6. **`attached_assets/` purge approved.** Rewrite git history to remove `attached_assets/` (it contains a user's PDF with a personal name) — e.g. `git filter-repo --path attached_assets --invert-paths` — then force-push and have collaborators re-clone. Also delete the directory going forward and add it to `.gitignore`. Note: this rewrites `main` and requires force-push rights; coordinate it as a standalone step, not mixed into a feature branch.

Still open (lower stakes, defaults chosen):
- **Evaluation workflow intent**: should supervisors see their team's evaluations in the list view (currently they can't — M6)? Assumed yes until contradicted.
- **Data retention**: notifications and activity logs grow forever; no policy required yet — revisit before production launch (relevant to the reminder idempotency design in 2.6).

---

## Areas with lighter review
`client/src/components/ui/*` (shadcn boilerplate), `server/vite.ts`/`static.ts` (Replit template), the full text of `server/seo/*Data.ts` content files, migration snapshots in `migrations/meta/`, and pixel-level UI behavior (no app was run during this audit — static analysis only).
