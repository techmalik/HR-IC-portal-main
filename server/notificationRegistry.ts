import { NotificationType, type NotificationTypeValue } from "@shared/schema";

// Recipient role for the notification, relative to the triggering action.
// "actor"     — the user who performed the action (rarely used; usually self-confirm).
// "subject"   — the user the action is *about* (e.g. the IC for an evaluation).
// "supervisor"— the subject's direct supervisor.
// "approver"  — the user designated to approve the entity (manager/admin/owner).
// "admin"     — all org admins/owners (e.g. contract renewal).
export type NotificationRecipient =
  | "actor"
  | "subject"
  | "supervisor"
  | "approver"
  | "admin";

export type NotificationCategory =
  | "oooNotifications"
  | "timesheetNotifications"
  | "overtimeNotifications"
  | "invoiceNotifications"
  | "deadlineReminders"
  | "evaluationNotifications"
  | "teamActionNotifications";

export interface NotificationSpec {
  category: NotificationCategory;
  recipients: ReadonlyArray<NotificationRecipient>;
  description: string;
}

// Single source of truth for every notification the platform can emit.
//
// `satisfies Record<NotificationTypeValue, NotificationSpec>` makes adding a
// new value to the NotificationType enum without registering a spec a TypeScript
// compile error. `npm run check` (which runs `tsc`) is wired in CI and locally
// as the lint guard for this exhaustiveness.
export const NOTIFICATION_REGISTRY = {
  [NotificationType.OOO_SUBMITTED]: {
    category: "oooNotifications",
    recipients: ["approver"],
    description: "OOO request submitted; approver is notified.",
  },
  [NotificationType.OOO_APPROVED]: {
    category: "oooNotifications",
    recipients: ["subject"],
    description: "OOO request approved; requester is notified.",
  },
  [NotificationType.OOO_REJECTED]: {
    category: "oooNotifications",
    recipients: ["subject"],
    description: "OOO request rejected; requester is notified.",
  },
  [NotificationType.TIMESHEET_SUBMITTED]: {
    category: "timesheetNotifications",
    recipients: ["supervisor"],
    description: "Timesheet submitted; supervisor is notified.",
  },
  [NotificationType.TIMESHEET_APPROVED]: {
    category: "timesheetNotifications",
    recipients: ["subject"],
    description: "Timesheet approved; IC is notified.",
  },
  [NotificationType.TIMESHEET_REJECTED]: {
    category: "timesheetNotifications",
    recipients: ["subject"],
    description: "Timesheet rejected; IC is notified.",
  },
  [NotificationType.TIMESHEET_UNLOCKED]: {
    category: "timesheetNotifications",
    recipients: ["subject"],
    description: "Approved timesheet unlocked for revision; IC is notified.",
  },
  [NotificationType.TIMESHEET_REMINDER]: {
    category: "deadlineReminders",
    recipients: ["subject"],
    description: "End-of-month timesheet not yet submitted; IC is reminded.",
  },
  [NotificationType.OVERTIME_SUBMITTED]: {
    category: "overtimeNotifications",
    recipients: ["approver"],
    description: "Overtime request submitted; approver is notified.",
  },
  [NotificationType.OVERTIME_APPROVED]: {
    category: "overtimeNotifications",
    recipients: ["subject"],
    description: "Overtime request approved; requester is notified.",
  },
  [NotificationType.OVERTIME_REJECTED]: {
    category: "overtimeNotifications",
    recipients: ["subject"],
    description: "Overtime request rejected; requester is notified.",
  },
  [NotificationType.INVOICE_UPLOADED]: {
    category: "invoiceNotifications",
    recipients: ["approver"],
    description: "Invoice uploaded; reviewer is notified.",
  },
  [NotificationType.INVOICE_APPROVED]: {
    category: "invoiceNotifications",
    recipients: ["subject"],
    description: "Invoice approved; IC is notified.",
  },
  [NotificationType.INVOICE_REJECTED]: {
    category: "invoiceNotifications",
    recipients: ["subject"],
    description: "Invoice rejected; IC is notified.",
  },
  [NotificationType.INVOICE_REVISION_REQUESTED]: {
    category: "invoiceNotifications",
    recipients: ["subject"],
    description: "Invoice revision requested; IC is notified.",
  },
  [NotificationType.INVOICE_PROCESSED]: {
    category: "invoiceNotifications",
    recipients: ["subject"],
    description: "Invoice marked as paid; IC is notified.",
  },
  [NotificationType.DEADLINE_REMINDER]: {
    category: "deadlineReminders",
    recipients: ["admin"],
    description: "Generic deadline reminder for admins/owners.",
  },
  [NotificationType.USER_CREATED]: {
    category: "teamActionNotifications",
    recipients: ["supervisor"],
    description: "New team member added; supervisor is notified.",
  },
  [NotificationType.USER_UPDATED]: {
    category: "teamActionNotifications",
    recipients: ["supervisor"],
    description: "Team member profile updated; supervisor is notified.",
  },
  [NotificationType.EVALUATION_CREATED]: {
    category: "evaluationNotifications",
    recipients: ["subject"],
    description: "Evaluation assigned; IC is notified.",
  },
  [NotificationType.EVALUATION_IC_SUBMITTED]: {
    category: "evaluationNotifications",
    recipients: ["approver"],
    description: "Self-assessment submitted; manager is notified.",
  },
  [NotificationType.EVALUATION_COMPLETED]: {
    category: "evaluationNotifications",
    recipients: ["subject"],
    description: "Evaluation finalized; IC is notified.",
  },
  [NotificationType.EVALUATION_REMINDER]: {
    category: "evaluationNotifications",
    recipients: ["subject"],
    description: "Evaluation due soon; recipient is reminded.",
  },
  [NotificationType.EVALUATION_OUTCOME]: {
    category: "evaluationNotifications",
    recipients: ["subject"],
    description: "Evaluation outcome (raise/bonus/PIP/etc.) recorded; IC is notified.",
  },
  [NotificationType.FEEDBACK_REQUESTED]: {
    category: "evaluationNotifications",
    recipients: ["subject"],
    description: "Peer feedback requested; recipient is notified.",
  },
  [NotificationType.EXPENSE_SUBMITTED]: {
    category: "invoiceNotifications",
    recipients: ["approver"],
    description: "Expense submitted; reviewer is notified.",
  },
  [NotificationType.EXPENSE_APPROVED]: {
    category: "invoiceNotifications",
    recipients: ["subject"],
    description: "Expense approved; submitter is notified.",
  },
  [NotificationType.EXPENSE_REJECTED]: {
    category: "invoiceNotifications",
    recipients: ["subject"],
    description: "Expense rejected; submitter is notified.",
  },
  [NotificationType.CONTRACT_RENEWAL_DUE]: {
    category: "deadlineReminders",
    recipients: ["admin", "subject"],
    description: "Contract notice/renewal threshold crossed; admins and IC are notified.",
  },
} as const satisfies Record<NotificationTypeValue, NotificationSpec>;

export type RegisteredNotificationType = keyof typeof NOTIFICATION_REGISTRY;

export function getNotificationSpec(type: NotificationTypeValue): NotificationSpec {
  return NOTIFICATION_REGISTRY[type];
}

export function categoryForRegisteredType(type: NotificationTypeValue): NotificationCategory {
  return NOTIFICATION_REGISTRY[type].category;
}
