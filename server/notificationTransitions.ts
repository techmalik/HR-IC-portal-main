import {
  NotificationType,
  type NotificationTypeValue,
} from "@shared/schema";

// Discriminated union of every approval-flow state transition that the
// platform fires. Adding a new transition kind here without extending the
// switch in `transitionToNotificationType` produces a TypeScript compile
// error (via the `assertNever` exhaustiveness check), so every state
// transition must be registered before it can compile.
export type ApprovalTransition =
  | { kind: "ooo.submitted" }
  | { kind: "ooo.approved" }
  | { kind: "ooo.rejected" }
  | { kind: "timesheet.submitted" }
  | { kind: "timesheet.approved" }
  | { kind: "timesheet.rejected" }
  | { kind: "timesheet.unlocked" }
  | { kind: "timesheet.reminder" }
  | { kind: "overtime.submitted" }
  | { kind: "overtime.approved" }
  | { kind: "overtime.rejected" }
  | { kind: "invoice.uploaded" }
  | { kind: "invoice.approved" }
  | { kind: "invoice.rejected" }
  | { kind: "invoice.revision_requested" }
  | { kind: "invoice.processed" }
  | { kind: "expense.submitted" }
  | { kind: "expense.approved" }
  | { kind: "expense.rejected" }
  | { kind: "evaluation.created" }
  | { kind: "evaluation.ic_submitted" }
  | { kind: "evaluation.completed" }
  | { kind: "evaluation.outcome" }
  | { kind: "evaluation.reminder" }
  | { kind: "evaluation.feedback_requested" }
  | { kind: "user.created" }
  | { kind: "user.updated" }
  | { kind: "contract.renewal_due" }
  | { kind: "deadline.reminder" };

export type ApprovalTransitionKind = ApprovalTransition["kind"];

function assertNever(x: never): never {
  throw new Error(`Unhandled approval transition: ${JSON.stringify(x)}`);
}

// Maps an approval state transition to the notification type it must emit.
// The exhaustive switch + `assertNever` enforce that every member of
// `ApprovalTransition` is handled — `npm run check` (tsc) fails otherwise.
export function transitionToNotificationType(
  transition: ApprovalTransition,
): NotificationTypeValue {
  switch (transition.kind) {
    case "ooo.submitted": return NotificationType.OOO_SUBMITTED;
    case "ooo.approved": return NotificationType.OOO_APPROVED;
    case "ooo.rejected": return NotificationType.OOO_REJECTED;
    case "timesheet.submitted": return NotificationType.TIMESHEET_SUBMITTED;
    case "timesheet.approved": return NotificationType.TIMESHEET_APPROVED;
    case "timesheet.rejected": return NotificationType.TIMESHEET_REJECTED;
    case "timesheet.unlocked": return NotificationType.TIMESHEET_UNLOCKED;
    case "timesheet.reminder": return NotificationType.TIMESHEET_REMINDER;
    case "overtime.submitted": return NotificationType.OVERTIME_SUBMITTED;
    case "overtime.approved": return NotificationType.OVERTIME_APPROVED;
    case "overtime.rejected": return NotificationType.OVERTIME_REJECTED;
    case "invoice.uploaded": return NotificationType.INVOICE_UPLOADED;
    case "invoice.approved": return NotificationType.INVOICE_APPROVED;
    case "invoice.rejected": return NotificationType.INVOICE_REJECTED;
    case "invoice.revision_requested": return NotificationType.INVOICE_REVISION_REQUESTED;
    case "invoice.processed": return NotificationType.INVOICE_PROCESSED;
    case "expense.submitted": return NotificationType.EXPENSE_SUBMITTED;
    case "expense.approved": return NotificationType.EXPENSE_APPROVED;
    case "expense.rejected": return NotificationType.EXPENSE_REJECTED;
    case "evaluation.created": return NotificationType.EVALUATION_CREATED;
    case "evaluation.ic_submitted": return NotificationType.EVALUATION_IC_SUBMITTED;
    case "evaluation.completed": return NotificationType.EVALUATION_COMPLETED;
    case "evaluation.outcome": return NotificationType.EVALUATION_OUTCOME;
    case "evaluation.reminder": return NotificationType.EVALUATION_REMINDER;
    case "evaluation.feedback_requested": return NotificationType.FEEDBACK_REQUESTED;
    case "user.created": return NotificationType.USER_CREATED;
    case "user.updated": return NotificationType.USER_UPDATED;
    case "contract.renewal_due": return NotificationType.CONTRACT_RENEWAL_DUE;
    case "deadline.reminder": return NotificationType.DEADLINE_REMINDER;
    default:
      return assertNever(transition);
  }
}

// Convenience listing for tests/iteration: every transition kind we know
// about. Keep alphabetised by domain to match the discriminated union.
export const ALL_TRANSITION_KINDS: ReadonlyArray<ApprovalTransitionKind> = [
  "ooo.submitted", "ooo.approved", "ooo.rejected",
  "timesheet.submitted", "timesheet.approved", "timesheet.rejected",
  "timesheet.unlocked", "timesheet.reminder",
  "overtime.submitted", "overtime.approved", "overtime.rejected",
  "invoice.uploaded", "invoice.approved", "invoice.rejected",
  "invoice.revision_requested", "invoice.processed",
  "expense.submitted", "expense.approved", "expense.rejected",
  "evaluation.created", "evaluation.ic_submitted", "evaluation.completed",
  "evaluation.outcome", "evaluation.reminder", "evaluation.feedback_requested",
  "user.created", "user.updated",
  "contract.renewal_due",
  "deadline.reminder",
];
