import { test } from "node:test";
import assert from "node:assert/strict";
import { NotificationType, type NotificationTypeValue } from "../../shared/schema.ts";
import {
  NOTIFICATION_REGISTRY,
  categoryForRegisteredType,
  getNotificationSpec,
} from "../notificationRegistry.ts";

test("registry covers every NotificationType (no missing entries)", () => {
  const allTypes = Object.values(NotificationType) as NotificationTypeValue[];
  for (const t of allTypes) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(NOTIFICATION_REGISTRY, t),
      `Missing registry entry for notification type: ${t}`,
    );
  }
});

test("registry has no extra entries beyond NotificationType", () => {
  const allTypes = new Set(Object.values(NotificationType));
  for (const k of Object.keys(NOTIFICATION_REGISTRY)) {
    assert.ok(allTypes.has(k as any), `Unexpected registry key: ${k}`);
  }
});

test("each spec has a non-empty recipient list and a category", () => {
  for (const [k, spec] of Object.entries(NOTIFICATION_REGISTRY)) {
    assert.ok(spec.recipients.length > 0, `${k} has no recipients`);
    assert.ok(spec.category, `${k} missing category`);
  }
});

test("representative transitions map to the right category", () => {
  assert.equal(categoryForRegisteredType(NotificationType.TIMESHEET_SUBMITTED), "timesheetNotifications");
  assert.equal(categoryForRegisteredType(NotificationType.TIMESHEET_REMINDER), "deadlineReminders");
  assert.equal(categoryForRegisteredType(NotificationType.INVOICE_PROCESSED), "invoiceNotifications");
  assert.equal(categoryForRegisteredType(NotificationType.EXPENSE_APPROVED), "invoiceNotifications");
  assert.equal(categoryForRegisteredType(NotificationType.EVALUATION_OUTCOME), "evaluationNotifications");
  assert.equal(categoryForRegisteredType(NotificationType.CONTRACT_RENEWAL_DUE), "deadlineReminders");
});

test("contract renewal notifies both admin and subject (IC)", () => {
  const spec = getNotificationSpec(NotificationType.CONTRACT_RENEWAL_DUE);
  assert.ok(spec.recipients.includes("admin"), "admin recipient missing");
  assert.ok(spec.recipients.includes("subject"), "subject (IC) recipient missing");
});

// Regression: every registered type must round-trip through getPreferenceCategory
// so toggling its preference category actually suppresses the notification.
test("getPreferenceCategory returns the registry-declared category for every registered type", async () => {
  const { getPreferenceCategory } = await import("../notificationService.ts");
  for (const [type, spec] of Object.entries(NOTIFICATION_REGISTRY)) {
    assert.equal(
      getPreferenceCategory(type),
      spec.category,
      `category mismatch for ${type}`,
    );
  }
});

test("getPreferenceCategory maps contract_renewal_due to deadlineReminders", async () => {
  const { getPreferenceCategory } = await import("../notificationService.ts");
  assert.equal(getPreferenceCategory("contract_renewal_due"), "deadlineReminders");
});
