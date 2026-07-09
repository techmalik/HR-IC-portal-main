// Regression tests for the P1 tenant-isolation guards (assertSameOrg,
// assertSelfOrOrgAdmin, assertSelfOrSupervisorOf, checkOrgBoundary,
// evaluationSectionAccess) shared across the timesheet/invoice/evaluation
// endpoints in routes.ts. These guards are the single choke point that keeps
// user A of org 1 from reading or writing org 2's data — see
// docs/audit-implementation-plan.md Phase 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Response } from "express";
import type { User } from "@shared/schema";

// server/db.ts throws at import time if DATABASE_URL is unset; routes.ts and
// storage.ts both import it transitively. A syntactically valid connection
// string is enough — pg's Pool doesn't connect until a query actually runs,
// and these tests never touch the real storage methods (they're monkey-patched).
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

const routes = await import("../routes.ts");
const { storage } = await import("../storage.ts");

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    organizationId: "org-1",
    email: "user@example.com",
    role: "ic",
    firstName: "Test",
    lastName: "User",
    ...overrides,
  } as User;
}

function fakeRes() {
  const calls: { status?: number; json?: any } = {};
  const res = {
    status(code: number) {
      calls.status = code;
      return res;
    },
    json(body: any) {
      calls.json = body;
      return res;
    },
  } as unknown as Response;
  return { res, calls };
}

test("checkOrgBoundary fails closed when currentUser has no organizationId", () => {
  const orphan = makeUser({ organizationId: null, email: "orphan@example.com" });
  assert.equal(routes.checkOrgBoundary(orphan, { organizationId: "org-2" }), false);
  assert.equal(routes.checkOrgBoundary(orphan, { organizationId: null }), false);
});

test("checkOrgBoundary denies cross-org and allows same-org", () => {
  const orgAUser = makeUser({ organizationId: "org-1" });
  assert.equal(routes.checkOrgBoundary(orgAUser, { organizationId: "org-2" }), false);
  assert.equal(routes.checkOrgBoundary(orgAUser, { organizationId: "org-1" }), true);
});

test("checkOrgBoundary bypasses for platform admins regardless of org", async (t) => {
  const prevEnv = process.env.PLATFORM_ADMIN_EMAILS;
  process.env.PLATFORM_ADMIN_EMAILS = "platform-admin@example.com";
  t.after(() => {
    process.env.PLATFORM_ADMIN_EMAILS = prevEnv;
  });
  const platformAdmin = makeUser({ organizationId: "org-1", email: "platform-admin@example.com" });
  assert.equal(routes.checkOrgBoundary(platformAdmin, { organizationId: "org-2" }), true);
});

test("assertSameOrg: 404 on missing entity, 403 on cross-org, true on same org", () => {
  const orgAUser = makeUser({ organizationId: "org-1" });

  const missing = fakeRes();
  assert.equal(routes.assertSameOrg(missing.res, orgAUser, undefined), false);
  assert.equal(missing.calls.status, 404);

  const crossOrg = fakeRes();
  assert.equal(routes.assertSameOrg(crossOrg.res, orgAUser, { organizationId: "org-2" }), false);
  assert.equal(crossOrg.calls.status, 403);

  const sameOrg = fakeRes();
  assert.equal(routes.assertSameOrg(sameOrg.res, orgAUser, { organizationId: "org-1" }), true);
  assert.equal(sameOrg.calls.status, undefined);
});

test("assertSelfOrOrgAdmin: user A of org 1 cannot read user B of org 2's data", async () => {
  const userA = makeUser({ id: "a", organizationId: "org-1", role: "admin" });
  const userBOfOrg2 = makeUser({ id: "b", organizationId: "org-2" });

  storage.getUser = (async (id: string) => (id === "b" ? userBOfOrg2 : undefined)) as any;

  const denied = fakeRes();
  assert.equal(await routes.assertSelfOrOrgAdmin(denied.res, userA, "b"), false);
  assert.equal(denied.calls.status, 403);
});

test("assertSelfOrOrgAdmin: same-org admin is allowed, self is always allowed", async () => {
  const admin = makeUser({ id: "admin-1", organizationId: "org-1", role: "admin" });
  const reportInSameOrg = makeUser({ id: "report-1", organizationId: "org-1" });

  storage.getUser = (async (id: string) =>
    id === "report-1" ? reportInSameOrg : undefined) as any;

  const allowed = fakeRes();
  assert.equal(await routes.assertSelfOrOrgAdmin(allowed.res, admin, "report-1"), true);
  assert.equal(allowed.calls.status, undefined);

  const selfAccess = fakeRes();
  assert.equal(await routes.assertSelfOrOrgAdmin(selfAccess.res, admin, "admin-1"), true);
});

test("assertSelfOrOrgAdmin: plain IC cannot read a teammate's data even in the same org", async () => {
  const ic = makeUser({ id: "ic-1", organizationId: "org-1", role: "ic" });
  const teammate = makeUser({ id: "ic-2", organizationId: "org-1" });
  storage.getUser = (async (id: string) => (id === "ic-2" ? teammate : undefined)) as any;

  const denied = fakeRes();
  assert.equal(await routes.assertSelfOrOrgAdmin(denied.res, ic, "ic-2"), false);
  assert.equal(denied.calls.status, 403);
});

test("assertSelfOrOrgAdmin: allowSupervisor lets a supervisor reach their own org's report only", async () => {
  const supervisorOrg1 = makeUser({ id: "sup-1", organizationId: "org-1", role: "ic" });
  const reportOrg1 = makeUser({ id: "report-1", organizationId: "org-1" });
  const reportOrg2 = makeUser({ id: "report-2", organizationId: "org-2" });

  storage.getUser = (async (id: string) => {
    if (id === "sup-1") return supervisorOrg1;
    if (id === "report-1") return reportOrg1;
    if (id === "report-2") return reportOrg2;
    return undefined;
  }) as any;
  storage.getUsersBySupervisor = (async (supervisorId: string) =>
    supervisorId === "sup-1" ? [reportOrg1] : []) as any;

  const allowedSameOrg = fakeRes();
  assert.equal(
    await routes.assertSelfOrOrgAdmin(allowedSameOrg.res, supervisorOrg1, "report-1", { allowSupervisor: true }),
    true
  );

  const deniedCrossOrg = fakeRes();
  assert.equal(
    await routes.assertSelfOrOrgAdmin(deniedCrossOrg.res, supervisorOrg1, "report-2", { allowSupervisor: true }),
    false
  );
  assert.equal(deniedCrossOrg.calls.status, 403);
});

test("assertSelfOrSupervisorOf: blocks acting on behalf of a user in a different org", async () => {
  const supervisor = makeUser({ id: "sup-1", organizationId: "org-1", role: "ic" });
  const targetInOrg2 = makeUser({ id: "target-1", organizationId: "org-2" });
  storage.getUser = (async (id: string) => (id === "target-1" ? targetInOrg2 : undefined)) as any;

  const denied = fakeRes();
  assert.equal(await routes.assertSelfOrSupervisorOf(denied.res, supervisor, "target-1"), false);
  assert.equal(denied.calls.status, 403);
});

test("assertSelfOrSupervisorOf: allows a direct supervisor within the same org, denies a non-report peer", async () => {
  const supervisor = makeUser({ id: "sup-1", organizationId: "org-1", role: "ic" });
  const directReport = makeUser({ id: "report-1", organizationId: "org-1" });
  const nonReportPeer = makeUser({ id: "peer-1", organizationId: "org-1" });

  storage.getUser = (async (id: string) => {
    if (id === "report-1") return directReport;
    if (id === "peer-1") return nonReportPeer;
    return undefined;
  }) as any;
  storage.getUsersBySupervisor = (async (supervisorId: string) =>
    supervisorId === "sup-1" ? [directReport] : []) as any;

  const allowed = fakeRes();
  assert.equal(await routes.assertSelfOrSupervisorOf(allowed.res, supervisor, "report-1"), true);

  const denied = fakeRes();
  assert.equal(await routes.assertSelfOrSupervisorOf(denied.res, supervisor, "peer-1"), false);
  assert.equal(denied.calls.status, 403);
});

test("assertSelfOrSupervisorOf: allowSelf:false blocks self-service management (IC responsibilities)", async () => {
  const ic = makeUser({ id: "ic-1", organizationId: "org-1", role: "ic" });
  const denied = fakeRes();
  assert.equal(
    await routes.assertSelfOrSupervisorOf(denied.res, ic, "ic-1", { allowSelf: false }),
    false
  );
  assert.equal(denied.calls.status, 403);
});

test("evaluationSectionAccess: only the IC, the assigned manager, or an admin/owner may write a section", () => {
  const evaluation = { icId: "ic-1", managerId: "mgr-1" };

  assert.equal(routes.evaluationSectionAccess(makeUser({ id: "ic-1", role: "ic" }), evaluation), "ic");
  assert.equal(routes.evaluationSectionAccess(makeUser({ id: "mgr-1", role: "ic" }), evaluation), "manager");
  assert.equal(routes.evaluationSectionAccess(makeUser({ id: "owner-1", role: "owner" }), evaluation), "both");
  assert.equal(routes.evaluationSectionAccess(makeUser({ id: "stranger-1", role: "ic" }), evaluation), null);
});

test("sanitizeEvaluationSectionUpdate: an IC on the self-assessment side cannot smuggle in manager-only fields", () => {
  const maliciousBody = {
    selfRating: 5,
    selfDocumentation: "did great",
    managerRating: 1,
    managerFeedback: "actually terrible",
    founderFeedback: "override",
  };
  const updates = routes.sanitizeEvaluationSectionUpdate(maliciousBody, "ic");
  assert.deepEqual(updates, { selfRating: 5, selfDocumentation: "did great" });
});
