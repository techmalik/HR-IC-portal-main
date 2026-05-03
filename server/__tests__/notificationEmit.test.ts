import { test } from "node:test";
import assert from "node:assert/strict";
import type { Notification, InsertNotification, NotificationPreferences } from "../../shared/schema.ts";
import { storage } from "../storage.ts";
import { notifyTimesheetReminder, notifyEvaluationOutcome } from "../notificationService.ts";

// Integration-style test: stub the storage methods that the notification path
// touches, invoke a representative trigger, and assert it emits a notification
// of the registry-mapped type with the correct shape. This validates that
// the endpoint-side wiring actually flows through to createNotification with
// the expected type — not just that the static catalog is well-formed.

type AnyFn = (...args: unknown[]) => unknown;

function withStubbedStorage<T>(
  overrides: Partial<typeof storage>,
  fn: () => Promise<T>,
): Promise<T> {
  const original: Record<string, AnyFn> = {};
  const target = storage as unknown as Record<string, AnyFn>;
  for (const k of Object.keys(overrides)) {
    original[k] = target[k];
    target[k] = (overrides as Record<string, AnyFn>)[k];
  }
  return fn().finally(() => {
    for (const k of Object.keys(original)) {
      target[k] = original[k];
    }
  });
}

const baselinePrefs: NotificationPreferences = {
  id: "p1",
  organizationId: null,
  userId: "user-1",
  inAppEnabled: true,
  emailEnabled: true,
  oooNotifications: true,
  timesheetNotifications: true,
  overtimeNotifications: true,
  invoiceNotifications: true,
  oooEmail: true,
  timesheetEmail: true,
  overtimeEmail: true,
  invoiceEmail: true,
  deadlineEmail: true,
  evaluationEmail: true,
  teamActionEmail: true,
  deadlineReminders: true,
  evaluationNotifications: true,
  teamActionNotifications: true,
};

test("notifyTimesheetReminder emits a registered timesheet_reminder notification", async () => {
  const created: InsertNotification[] = [];
  await withStubbedStorage(
    {
      getNotificationPreferences: async () => baselinePrefs,
      createNotification: async (n: InsertNotification): Promise<Notification> => {
        created.push(n);
        return {
          id: "n1",
          organizationId: null,
          userId: n.userId,
          actorId: n.actorId ?? null,
          type: n.type,
          title: n.title,
          message: n.message,
          entityType: n.entityType ?? null,
          entityId: n.entityId ?? null,
          isRead: false,
          createdAt: new Date(),
        };
      },
      getUser: async () => undefined,
    } as Partial<typeof storage>,
    async () => {
      await notifyTimesheetReminder("user-1", 5, 2026);
    },
  );

  assert.equal(created.length, 1, "expected exactly one notification");
  const n = created[0];
  assert.equal(n.type, "timesheet_reminder");
  assert.equal(n.userId, "user-1");
  assert.equal(n.entityType, "timesheet");
  assert.equal(n.entityId, "ts-reminder:2026-05");
  assert.match(n.message, /May 2026/);
});

test("notifyEvaluationOutcome is suppressed when evaluation prefs are disabled", async () => {
  const created: InsertNotification[] = [];
  await withStubbedStorage(
    {
      getNotificationPreferences: async () => ({
        ...baselinePrefs,
        evaluationNotifications: false,
      }),
      createNotification: async (n: InsertNotification): Promise<Notification> => {
        created.push(n);
        return {
          id: "n2",
          organizationId: null,
          userId: n.userId,
          actorId: n.actorId ?? null,
          type: n.type,
          title: n.title,
          message: n.message,
          entityType: n.entityType ?? null,
          entityId: n.entityId ?? null,
          isRead: false,
          createdAt: new Date(),
        };
      },
      getUser: async () => undefined,
    } as Partial<typeof storage>,
    async () => {
      await notifyEvaluationOutcome("eval-1", "user-1", ["raise"], "manager-1");
    },
  );

  assert.equal(created.length, 0, "evaluation outcome should have been suppressed by preferences");
});

test("notifyEvaluationOutcome emits when prefs are enabled and outcomes are non-empty", async () => {
  const created: InsertNotification[] = [];
  await withStubbedStorage(
    {
      getNotificationPreferences: async () => baselinePrefs,
      createNotification: async (n: InsertNotification): Promise<Notification> => {
        created.push(n);
        return {
          id: "n3",
          organizationId: null,
          userId: n.userId,
          actorId: n.actorId ?? null,
          type: n.type,
          title: n.title,
          message: n.message,
          entityType: n.entityType ?? null,
          entityId: n.entityId ?? null,
          isRead: false,
          createdAt: new Date(),
        };
      },
      getUser: async () => undefined,
    } as Partial<typeof storage>,
    async () => {
      await notifyEvaluationOutcome("eval-2", "user-2", ["pip"], "manager-2");
    },
  );

  assert.equal(created.length, 1);
  assert.equal(created[0].type, "evaluation_outcome");
  assert.equal(created[0].entityType, "evaluation");
  assert.equal(created[0].entityId, "eval-2");
  assert.match(created[0].message, /Performance Improvement Plan/);
});
