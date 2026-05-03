import { storage } from "./storage";
import type { InsertNotification, User, NotificationType, Contract } from "@shared/schema";
import { sendNotificationEmail } from "./emailService";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  additionalEmailDetails?: Record<string, string>;
}

const wsClients: Map<string, Set<WebSocket>> = new Map();

export function registerWebSocketClient(userId: string, ws: WebSocket) {
  if (!wsClients.has(userId)) {
    wsClients.set(userId, new Set());
  }
  wsClients.get(userId)!.add(ws);
}

export function unregisterWebSocketClient(userId: string, ws: WebSocket) {
  const clients = wsClients.get(userId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      wsClients.delete(userId);
    }
  }
}

async function sendToWebSocket(userId: string, notification: any) {
  const clients = wsClients.get(userId);
  if (clients) {
    const message = JSON.stringify({ type: "notification", data: notification });
    clients.forEach((ws) => {
      if ((ws as any).readyState === 1) {
        ws.send(message);
      }
    });
  }
}

async function shouldNotifyUser(userId: string, notificationType: string, isTeamAction: boolean = false): Promise<boolean> {
  const prefs = await storage.getNotificationPreferences(userId);
  if (!prefs) {
    await storage.createNotificationPreferences({
      userId,
      inAppEnabled: true,
      emailEnabled: true,
      oooNotifications: true,
      timesheetNotifications: true,
      overtimeNotifications: true,
      invoiceNotifications: true,
      deadlineReminders: true,
      evaluationNotifications: true,
      teamActionNotifications: true,
    });
    return true;
  }
  if (!prefs.inAppEnabled) return false;
  
  // Check if this is a team action notification for admins
  if (isTeamAction && !prefs.teamActionNotifications) return false;
  
  if (notificationType.startsWith("ooo_") && !prefs.oooNotifications) return false;
  if (notificationType.startsWith("timesheet_") && !prefs.timesheetNotifications) return false;
  if (notificationType.startsWith("overtime_") && !prefs.overtimeNotifications) return false;
  if (notificationType.startsWith("invoice_") && !prefs.invoiceNotifications) return false;
  if (notificationType.startsWith("expense_") && !prefs.invoiceNotifications) return false;
  if (notificationType === "deadline_reminder" && !prefs.deadlineReminders) return false;
  if ((notificationType === "evaluation_reminder" || notificationType === "feedback_requested") && !prefs.evaluationNotifications) return false;
  
  return true;
}

async function getActorName(actorId?: string): Promise<string | undefined> {
  if (!actorId) return undefined;
  const actor = await storage.getUser(actorId);
  return actor ? `${actor.firstName} ${actor.lastName}` : undefined;
}

export async function createNotification(
  userId: string,
  payload: NotificationPayload,
  isTeamAction: boolean = false
): Promise<void> {
  const shouldNotifyInApp = await shouldNotifyUser(userId, payload.type, isTeamAction);
  
  if (shouldNotifyInApp) {
    const notification = await storage.createNotification({
      userId,
      actorId: payload.actorId || null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entityType: payload.entityType || null,
      entityId: payload.entityId || null,
    });

    await sendToWebSocket(userId, notification);
  }

  setImmediate(async () => {
    try {
      const actorName = await getActorName(payload.actorId);
      await sendNotificationEmail(userId, {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actorName,
        additionalDetails: payload.additionalEmailDetails,
      });
    } catch (error) {
      console.error("Non-blocking email send failed:", error);
    }
  });
}

export async function notifyOOOSubmitted(
  request: any,
  submitter: User
): Promise<void> {
  await createNotification(request.managerId, {
    type: "ooo_submitted",
    title: "New OOO Request",
    message: `${submitter.firstName} ${submitter.lastName} submitted an OOO request`,
    entityType: "ooo_request",
    entityId: request.id,
    actorId: submitter.id,
    additionalEmailDetails: {
      "Start Date": request.startDate,
      "End Date": request.endDate,
      "Type": request.oooType === "half_day" ? "Half Day" : "Full Day",
      ...(request.reason && { "Reason": request.reason }),
    },
  });
}

export async function notifyOOOApproved(
  request: any,
  reviewer: User
): Promise<void> {
  await createNotification(request.userId, {
    type: "ooo_approved",
    title: "OOO Request Approved",
    message: `Your OOO request has been approved by ${reviewer.firstName} ${reviewer.lastName}`,
    entityType: "ooo_request",
    entityId: request.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Start Date": request.startDate,
      "End Date": request.endDate,
      "Type": request.oooType === "half_day" ? "Half Day" : "Full Day",
    },
  });
}

export async function notifyOOORejected(
  request: any,
  reviewer: User,
  reason?: string
): Promise<void> {
  await createNotification(request.userId, {
    type: "ooo_rejected",
    title: "OOO Request Rejected",
    message: reason 
      ? `Your OOO request was rejected: ${reason}`
      : `Your OOO request was rejected by ${reviewer.firstName} ${reviewer.lastName}`,
    entityType: "ooo_request",
    entityId: request.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Start Date": request.startDate,
      "End Date": request.endDate,
      ...(reason && { "Reason": reason }),
    },
  });
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export async function notifyTimesheetSubmitted(
  timesheet: any,
  submitter: User
): Promise<void> {
  const emailDetails = {
    "Period": `${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year}`,
    "Total Hours": `${timesheet.totalHours} hours`,
  };

  // Collect unique recipient IDs to avoid duplicate notifications
  const recipientIds = new Set<string>();

  // Add all admins (except the submitter)
  const admins = await storage.getUsersByRole("admin");
  for (const admin of admins) {
    if (admin.id !== submitter.id) {
      recipientIds.add(admin.id);
    }
  }

  // Add supervisor if they exist and are not the submitter (self-supervision edge case)
  const supervisorId = submitter.supervisorId;
  if (supervisorId && supervisorId !== submitter.id) {
    recipientIds.add(supervisorId);
  }

  // Send notifications to all unique recipients
  for (const recipientId of Array.from(recipientIds)) {
    await createNotification(recipientId, {
      type: "timesheet_submitted",
      title: "Timesheet Submitted for Review",
      message: `${submitter.firstName} ${submitter.lastName} submitted their timesheet for review`,
      entityType: "timesheet",
      entityId: timesheet.id,
      actorId: submitter.id,
      additionalEmailDetails: emailDetails,
    });
  }
}

export async function notifyTimesheetApproved(
  timesheet: any,
  userId: string,
  reviewer: User
): Promise<void> {
  const emailDetails = {
    "Period": `${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year}`,
    "Total Hours": `${timesheet.totalHours} hours`,
  };

  // Notify the timesheet owner
  await createNotification(userId, {
    type: "timesheet_approved",
    title: "Timesheet Approved",
    message: `Your timesheet has been approved by ${reviewer.firstName} ${reviewer.lastName}`,
    entityType: "timesheet",
    entityId: timesheet.id,
    actorId: reviewer.id,
    additionalEmailDetails: emailDetails,
  });

  // Notify supervisor if reviewer is not the supervisor (admin approved their team member's timesheet)
  const timesheetOwner = await storage.getUser(userId);
  if (timesheetOwner?.supervisorId && timesheetOwner.supervisorId !== reviewer.id) {
    await createNotification(timesheetOwner.supervisorId, {
      type: "timesheet_approved",
      title: "Team Timesheet Approved",
      message: `${timesheetOwner.firstName} ${timesheetOwner.lastName}'s timesheet was approved by ${reviewer.firstName} ${reviewer.lastName}`,
      entityType: "timesheet",
      entityId: timesheet.id,
      actorId: reviewer.id,
      additionalEmailDetails: emailDetails,
    });
  }

  // Notify admins if reviewer is a supervisor (not admin) who approved their team member's timesheet
  if (reviewer.role !== "admin") {
    const admins = await storage.getUsersByRole("admin");
    for (const admin of admins) {
      await createNotification(admin.id, {
        type: "timesheet_approved",
        title: "Team Timesheet Approved",
        message: `${timesheetOwner?.firstName} ${timesheetOwner?.lastName}'s timesheet was approved by ${reviewer.firstName} ${reviewer.lastName}`,
        entityType: "timesheet",
        entityId: timesheet.id,
        actorId: reviewer.id,
        additionalEmailDetails: emailDetails,
      }, true);
    }
  }
}

export async function notifyTimesheetRejected(
  timesheet: any,
  userId: string,
  reviewer: User,
  reason?: string
): Promise<void> {
  const emailDetails = {
    "Period": `${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year}`,
    ...(reason && { "Reason": reason }),
  };

  // Notify the timesheet owner
  await createNotification(userId, {
    type: "timesheet_rejected",
    title: "Timesheet Rejected",
    message: reason
      ? `Your timesheet was rejected: ${reason}`
      : `Your timesheet was rejected by ${reviewer.firstName} ${reviewer.lastName}`,
    entityType: "timesheet",
    entityId: timesheet.id,
    actorId: reviewer.id,
    additionalEmailDetails: emailDetails,
  });

  // Notify supervisor if reviewer is not the supervisor (admin rejected their team member's timesheet)
  const timesheetOwner = await storage.getUser(userId);
  if (timesheetOwner?.supervisorId && timesheetOwner.supervisorId !== reviewer.id) {
    await createNotification(timesheetOwner.supervisorId, {
      type: "timesheet_rejected",
      title: "Team Timesheet Rejected",
      message: `${timesheetOwner.firstName} ${timesheetOwner.lastName}'s timesheet was rejected by ${reviewer.firstName} ${reviewer.lastName}${reason ? `: ${reason}` : ''}`,
      entityType: "timesheet",
      entityId: timesheet.id,
      actorId: reviewer.id,
      additionalEmailDetails: emailDetails,
    });
  }

  // Notify admins if reviewer is a supervisor (not admin) who rejected their team member's timesheet
  if (reviewer.role !== "admin") {
    const admins = await storage.getUsersByRole("admin");
    for (const admin of admins) {
      await createNotification(admin.id, {
        type: "timesheet_rejected",
        title: "Team Timesheet Rejected",
        message: `${timesheetOwner?.firstName} ${timesheetOwner?.lastName}'s timesheet was rejected by ${reviewer.firstName} ${reviewer.lastName}${reason ? `: ${reason}` : ''}`,
        entityType: "timesheet",
        entityId: timesheet.id,
        actorId: reviewer.id,
        additionalEmailDetails: emailDetails,
      }, true);
    }
  }
}

export async function notifyOvertimeSubmitted(
  request: any,
  submitter: User
): Promise<void> {
  const supervisorId = submitter.supervisorId;
  if (!supervisorId) return;

  const requestType = request.isWeekendWork ? "weekend work" : "overtime";
  
  await createNotification(supervisorId, {
    type: "overtime_submitted",
    title: request.isWeekendWork ? "Weekend Work Request" : "Overtime Request Submitted",
    message: `${submitter.firstName} ${submitter.lastName} requested ${request.requestedHours} ${requestType} hours`,
    entityType: "overtime_request",
    entityId: request.id,
    actorId: submitter.id,
    additionalEmailDetails: {
      "Date": request.date,
      "Requested Hours": `${request.requestedHours} hours`,
      "Type": request.isWeekendWork ? "Weekend Work" : "Overtime",
    },
  });
}

export async function notifyOvertimeApproved(
  request: any,
  reviewer: User
): Promise<void> {
  const requestType = request.isWeekendWork ? "weekend work" : "overtime";
  
  await createNotification(request.userId, {
    type: "overtime_approved",
    title: request.isWeekendWork ? "Weekend Work Approved" : "Overtime Request Approved",
    message: `Your ${requestType} request was approved: ${request.approvedHours} hours`,
    entityType: "overtime_request",
    entityId: request.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Date": request.date,
      "Approved Hours": `${request.approvedHours} hours`,
    },
  });
}

export async function notifyOvertimeRejected(
  request: any,
  reviewer: User,
  reason?: string
): Promise<void> {
  const requestType = request.isWeekendWork ? "weekend work" : "overtime";
  
  await createNotification(request.userId, {
    type: "overtime_rejected",
    title: request.isWeekendWork ? "Weekend Work Rejected" : "Overtime Request Rejected",
    message: reason
      ? `Your ${requestType} request was rejected: ${reason}`
      : `Your ${requestType} request was rejected`,
    entityType: "overtime_request",
    entityId: request.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Date": request.date,
      ...(reason && { "Reason": reason }),
    },
  });
}

export async function notifyInvoiceUploaded(
  invoice: any,
  uploader: User
): Promise<void> {
  const admins = await storage.getUsersByRole("admin");
  const emailDetails = {
    "Invoice Number": invoice.invoiceNumber,
    "Period": `${invoice.month}/${invoice.year}`,
    ...(invoice.amount && { "Amount": `$${(invoice.amount / 100).toFixed(2)}` }),
  };

  for (const admin of admins) {
    if (admin.id !== uploader.id) {
      await createNotification(admin.id, {
        type: "invoice_uploaded",
        title: "Invoice Submitted for Review",
        message: `${uploader.firstName} ${uploader.lastName} submitted an invoice for approval`,
        entityType: "invoice",
        entityId: invoice.id,
        actorId: uploader.id,
        additionalEmailDetails: emailDetails,
      });
    }
  }
  
  if (uploader.supervisorId && uploader.supervisorId !== uploader.id) {
    await createNotification(uploader.supervisorId, {
      type: "invoice_uploaded",
      title: "Invoice Submitted for Review",
      message: `${uploader.firstName} ${uploader.lastName} submitted an invoice for approval`,
      entityType: "invoice",
      entityId: invoice.id,
      actorId: uploader.id,
      additionalEmailDetails: emailDetails,
    });
  }
}

export async function notifyInvoiceApproved(
  invoice: any,
  userId: string,
  reviewer: User
): Promise<void> {
  await createNotification(userId, {
    type: "invoice_approved",
    title: "Invoice Approved",
    message: `Your invoice ${invoice.invoiceNumber} has been approved and synced to our records`,
    entityType: "invoice",
    entityId: invoice.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Invoice Number": invoice.invoiceNumber,
      "Period": `${invoice.month}/${invoice.year}`,
    },
  });
}

export async function notifyInvoiceRejected(
  invoice: any,
  userId: string,
  reviewer: User,
  reason?: string
): Promise<void> {
  await createNotification(userId, {
    type: "invoice_rejected",
    title: "Invoice Rejected",
    message: reason
      ? `Your invoice ${invoice.invoiceNumber} was rejected: ${reason}`
      : `Your invoice ${invoice.invoiceNumber} was rejected. Please review and resubmit.`,
    entityType: "invoice",
    entityId: invoice.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Invoice Number": invoice.invoiceNumber,
      ...(reason && { "Reason": reason }),
    },
  });
}

export async function notifyInvoiceRevisionRequested(
  invoice: any,
  userId: string,
  reviewer: User,
  reason?: string
): Promise<void> {
  await createNotification(userId, {
    type: "invoice_revision_requested",
    title: "Invoice Revision Requested",
    message: reason
      ? `Revision requested for invoice ${invoice.invoiceNumber}: ${reason}`
      : `Revision requested for invoice ${invoice.invoiceNumber}. Please update and resubmit.`,
    entityType: "invoice",
    entityId: invoice.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Invoice Number": invoice.invoiceNumber,
      ...(reason && { "Reason": reason }),
    },
  });
}

export async function notifyContractExpiring(
  contract: Contract,
  contractor: User
): Promise<void> {
  const admins = await storage.getUsersByRole("admin", contractor.organizationId || undefined);
  const owners = await storage.getUsersByRole("owner", contractor.organizationId || undefined);
  const recipients = [...admins, ...owners];
  const seen = new Set<string>();
  const daysUntil = Math.ceil(
    (new Date(contract.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  for (const r of recipients) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    await createNotification(r.id, {
      type: "deadline_reminder",
      title: "Contract Renewal Approaching",
      message: `${contractor.firstName} ${contractor.lastName}'s contract "${contract.title}" expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      entityType: "user",
      entityId: contractor.id,
      additionalEmailDetails: {
        Contractor: `${contractor.firstName} ${contractor.lastName}`,
        Contract: contract.title,
        "End Date": contract.endDate,
        "Notice Period": `${contract.noticePeriodDays} days`,
      },
    });
  }
}

export async function notifyUserCreated(
  newUser: User,
  creatorId?: string
): Promise<void> {
  if (newUser.supervisorId) {
    await createNotification(newUser.supervisorId, {
      type: "user_created",
      title: "New Team Member",
      message: `${newUser.firstName} ${newUser.lastName} has been added to your team`,
      entityType: "user",
      entityId: newUser.id,
      actorId: creatorId || undefined,
      additionalEmailDetails: {
        "Name": `${newUser.firstName} ${newUser.lastName}`,
        "Email": newUser.email,
        ...(newUser.jobTitle && { "Job Title": newUser.jobTitle }),
      },
    });
  }
}

export async function notifyEvaluationCreated(
  evaluationId: string,
  icId: string,
  periodStart: string,
  periodEnd: string,
  managerId: string
): Promise<void> {
  const manager = await storage.getUser(managerId);
  
  await createNotification(icId, {
    type: "evaluation_created",
    title: "Performance Evaluation Created",
    message: `A new performance evaluation has been created for you`,
    entityType: "evaluation",
    entityId: evaluationId,
    actorId: managerId,
    additionalEmailDetails: {
      "Period": `${periodStart} to ${periodEnd}`,
      ...(manager && { "Created by": `${manager.firstName} ${manager.lastName}` }),
    },
  });
}

export async function notifyEvaluationReminder(
  evaluationId: string,
  userId: string,
  periodEnd: string
): Promise<void> {
  await createNotification(userId, {
    type: "evaluation_reminder",
    title: "Performance Evaluation Reminder",
    message: `Your performance evaluation is due soon. Please complete your self-assessment.`,
    entityType: "evaluation",
    entityId: evaluationId,
    additionalEmailDetails: {
      "Period End Date": periodEnd,
    },
  });
}

export async function notifyFeedbackRequested(
  evaluationId: string,
  requesterId: string,
  targetUserId: string,
  icName: string
): Promise<void> {
  await createNotification(targetUserId, {
    type: "feedback_requested",
    title: "Feedback Requested",
    message: `You've been asked to provide feedback for ${icName}'s performance evaluation.`,
    entityType: "evaluation",
    entityId: evaluationId,
    actorId: requesterId,
    additionalEmailDetails: {
      "For": icName,
    },
  });
}

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  software: "Software",
  travel: "Travel",
  equipment: "Equipment",
  other: "Other",
};

function formatExpenseAmount(amount: number, currency: string): string {
  const value = (amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${value}`;
}

export async function notifyExpenseSubmitted(
  expense: any,
  submitter: User
): Promise<void> {
  if (!expense.managerId) return;
  await createNotification(expense.managerId, {
    type: "expense_submitted",
    title: "New Expense Request",
    message: `${submitter.firstName} ${submitter.lastName} submitted a ${EXPENSE_CATEGORY_LABEL[expense.category] || expense.category} expense for ${formatExpenseAmount(expense.amount, expense.currency)}`,
    entityType: "expense",
    entityId: expense.id,
    actorId: submitter.id,
    additionalEmailDetails: {
      "Amount": formatExpenseAmount(expense.amount, expense.currency),
      "Category": EXPENSE_CATEGORY_LABEL[expense.category] || expense.category,
      "Date": expense.expenseDate,
      "Description": expense.description,
    },
  });
}

export async function notifyExpenseApproved(
  expense: any,
  reviewer: User
): Promise<void> {
  await createNotification(expense.userId, {
    type: "expense_approved",
    title: "Expense Approved",
    message: `Your ${EXPENSE_CATEGORY_LABEL[expense.category] || expense.category} expense for ${formatExpenseAmount(expense.amount, expense.currency)} was approved`,
    entityType: "expense",
    entityId: expense.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Amount": formatExpenseAmount(expense.amount, expense.currency),
      "Category": EXPENSE_CATEGORY_LABEL[expense.category] || expense.category,
      "Reviewer": `${reviewer.firstName} ${reviewer.lastName}`,
    },
  });
}

export async function notifyExpenseRejected(
  expense: any,
  reviewer: User,
  reason?: string
): Promise<void> {
  await createNotification(expense.userId, {
    type: "expense_rejected",
    title: "Expense Rejected",
    message: reason
      ? `Your ${EXPENSE_CATEGORY_LABEL[expense.category] || expense.category} expense was rejected: ${reason}`
      : `Your ${EXPENSE_CATEGORY_LABEL[expense.category] || expense.category} expense for ${formatExpenseAmount(expense.amount, expense.currency)} was rejected`,
    entityType: "expense",
    entityId: expense.id,
    actorId: reviewer.id,
    additionalEmailDetails: {
      "Amount": formatExpenseAmount(expense.amount, expense.currency),
      "Category": EXPENSE_CATEGORY_LABEL[expense.category] || expense.category,
      ...(reason && { "Reason": reason }),
    },
  });
}

export { wsClients };
