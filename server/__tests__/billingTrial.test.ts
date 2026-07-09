// Regression tests for the P2-4 hard trial-lockout gate: isTrialExpired
// decides whether an org is locked out, isExemptFromTrialLock decides which
// paths stay reachable while locked (logout, billing, subscribe, notifications).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

const routes = await import("../routes.ts");

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

test("isTrialExpired: false when there is no subscription", () => {
  assert.equal(routes.isTrialExpired(null), false);
  assert.equal(routes.isTrialExpired(undefined), false);
});

test("isTrialExpired: false for paid plans regardless of trialEndsAt", () => {
  assert.equal(
    routes.isTrialExpired({ plan: "starter", trialEndsAt: daysFromNow(-10), paystackSubscriptionCode: null }),
    false
  );
});

test("isTrialExpired: false when trialEndsAt is unset", () => {
  assert.equal(
    routes.isTrialExpired({ plan: "free", trialEndsAt: null, paystackSubscriptionCode: null }),
    false
  );
});

test("isTrialExpired: false while still within the trial window", () => {
  assert.equal(
    routes.isTrialExpired({ plan: "free", trialEndsAt: daysFromNow(3), paystackSubscriptionCode: null }),
    false
  );
});

test("isTrialExpired: true once trialEndsAt has passed with no live subscription code", () => {
  assert.equal(
    routes.isTrialExpired({ plan: "free", trialEndsAt: daysFromNow(-1), paystackSubscriptionCode: null }),
    true
  );
});

test("isTrialExpired: false past trialEndsAt if a live Paystack subscription code exists", () => {
  // Between checkout and the confirming webhook flipping the plan to paid —
  // must not lock the org out while payment is in flight.
  assert.equal(
    routes.isTrialExpired({ plan: "free", trialEndsAt: daysFromNow(-1), paystackSubscriptionCode: "SUB_123" }),
    false
  );
});

test("isExemptFromTrialLock: allows logout, billing read, subscribe, and notification reads", () => {
  assert.equal(routes.isExemptFromTrialLock({ method: "POST", path: "/api/auth/logout" }), true);
  assert.equal(routes.isExemptFromTrialLock({ method: "GET", path: "/api/billing" }), true);
  assert.equal(routes.isExemptFromTrialLock({ method: "POST", path: "/api/billing/subscribe" }), true);
  assert.equal(routes.isExemptFromTrialLock({ method: "GET", path: "/api/notifications/count" }), true);
});

test("isExemptFromTrialLock: blocks ordinary app routes and write methods on exempt paths", () => {
  assert.equal(routes.isExemptFromTrialLock({ method: "GET", path: "/api/timesheets" }), false);
  assert.equal(routes.isExemptFromTrialLock({ method: "POST", path: "/api/invoices" }), false);
  // Only the specific exempt method+path combinations are allowed — a GET on
  // the logout path (which doesn't exist as a route) must not slip through.
  assert.equal(routes.isExemptFromTrialLock({ method: "GET", path: "/api/auth/logout" }), false);
});
