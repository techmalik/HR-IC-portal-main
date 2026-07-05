# Threat Model

## Project Overview

Axle is a multi-tenant contractor management SaaS. It uses a React/TypeScript frontend, a Node.js/Express backend, PostgreSQL through Drizzle ORM, database-backed session cookies, Replit Object Storage for invoices/receipts/contracts/avatars, and Resend for email notifications. Users include organization owners, admins, independent contractors, and IC supervisors with direct reports.

## Assets

- **User accounts and sessions** -- usernames, emails, bcrypt password hashes, session tokens, active/disabled status, and role assignments. Compromise allows account takeover and cross-tenant access.
- **Organization and contractor data** -- profile details, hourly rates, monthly caps, supervisor relationships, contracts, payment details, invoices, timesheets, expenses, evaluations, leave requests, notifications, and activity logs.
- **Uploaded documents** -- invoice PDFs, receipts, contracts, and avatars in object storage. These can contain PII, bank details, tax data, and confidential contract terms.
- **Tenant isolation metadata** -- `organizationId`, `userId`, `managerId`, `supervisorId`, and role fields. Incorrect use can expose or modify another organization's data.
- **Application secrets and production data artifacts** -- database URLs, API keys, backup SQL dumps, and stored session rows.

## Trust Boundaries

- **Browser to Express API** -- all client requests are untrusted. The API must authenticate requests using the `session_token` cookie and enforce authorization server-side.
- **Public pages to authenticated app** -- landing, SEO/blog/programmatic pages, login, signup, and subscription capture are public; `/api` business data endpoints must require auth except explicit auth/register/subscribe endpoints.
- **Authenticated user to admin/owner/supervisor boundaries** -- role checks and dynamic supervisor checks decide who may read, approve, edit, or delete sensitive records.
- **Tenant boundary** -- every organization must be isolated. Any endpoint accepting `userId`, entity IDs, or `organizationId` from the client must verify the referenced record belongs to the authenticated user's organization and permitted relationship.
- **API to PostgreSQL** -- storage uses Drizzle. All queries must remain parameterized and scoped to the authenticated tenant where required.
- **API to Object Storage** -- uploaded documents move between users, the backend, and Replit Object Storage. Object creation, object reads, and stored `fileUrl` values must be tied to authenticated users and authorization rules.
- **API to email provider** -- notification content sent through Resend may contain personal or workflow data and must not leak across tenants.
- **Production vs development** -- Vite dev middleware, tests, seed scripts, mockups, and experimental assets are out of production scope unless reachable when `NODE_ENV=production`.

## Scan Anchors

- Production entry points: `server/index.ts`, `server/routes.ts`, `server/sessionManager.ts`, `server/storage.ts`, `server/replit_integrations/object_storage/routes.ts`, `server/migrate-files.ts`, `server/emailService.ts`, `shared/schema.ts`.
- Highest-risk areas: multi-tenant route authorization in `server/routes.ts`, object upload/download flow under `server/replit_integrations/object_storage/`, file migration route `server/migrate-files.ts`, session storage in `server/sessionManager.ts`, backup/data files in the repository root, and bulk review logic in `server/bulkReview.ts`.
- Public surfaces: `/`, `/login`, `/signup`, blog/SEO/programmatic pages, `/api/auth/login`, `/api/auth/register`, `/api/blog/subscribe`, `/objects/*`, and `/ws` connection handshake.
- Authenticated surfaces: user, timesheet, invoice, expense, OOO, overtime, evaluation, contract, notification, organization, and billing APIs.
- Admin/owner surfaces: user management, billing, blog/SEO admin endpoints, activity logs, contract management, file migration, and mark-paid actions.
- Dev-only areas: `server/vite.ts`, `server/__tests__/`, `server/seed.ts`, build scripts, Vite HMR/client tooling, and static design/reference assets not served in production. Mockup sandbox artifacts are not production deployments.

## Threat Categories

### Spoofing

Users authenticate with opaque 32-byte session tokens stored in the database and set in an HTTP-only cookie. Login, registration, WebSocket setup, and authenticated APIs must validate the token, reject disabled users, use secure cookie flags in production, and prevent session tokens from being exposed in repository artifacts or logs.

### Tampering

The client is untrusted and can submit arbitrary IDs, roles, statuses, file URLs, amounts, hours, and workflow state. Server routes must derive tenant, actor, reviewer, and privileged fields from `req.authenticatedUser`, not from the request body, and must validate status transitions, invoice/timesheet coupling, seat limits, and uploaded file metadata server-side.

### Information Disclosure

Multi-tenant records and uploaded documents must only be returned to the owning user, their authorized supervisor, or an admin/owner within the same organization. Backup files, API logs, error messages, object URLs, and public object routes must not expose user PII, password hashes, session tokens, bank details, contract files, invoices, receipts, or cross-tenant data.

### Denial of Service

Public login/signup/upload-url endpoints, JSON body parsing, in-memory login rate limits, object downloads, file migration uploads, and bulk review actions can consume compute, memory, storage, or email quota. Production endpoints should enforce bounded request sizes, rate limits that work behind proxies and across instances, authenticated upload creation, and authorization before expensive work.

### Elevation of Privilege

The primary EoP risk is broken function-level authorization or IDOR in APIs that accept `userId` or entity IDs. Contractors must not be able to act as other users, supervisors must only manage direct reports where intended, admins/owners must stay within their organization, and public object routes must not bypass application authorization. Database access should remain parameterized and object storage paths should not be attacker-controlled.