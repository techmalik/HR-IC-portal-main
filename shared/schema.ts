import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum - simplified to 2 roles only
// Note: ICs dynamically gain supervisor features when assigned team members
export const UserRole = {
  IC: "ic",
  ADMIN: "admin",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Request status enum
export const RequestStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type RequestStatusType = (typeof RequestStatus)[keyof typeof RequestStatus];

// Timesheet status enum
export const TimesheetStatus = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type TimesheetStatusType = (typeof TimesheetStatus)[keyof typeof TimesheetStatus];

// Invoice status enum
export const InvoiceStatus = {
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  REVISION_REQUESTED: "revision_requested",
} as const;

export type InvoiceStatusType = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

// Contractor status enum
export const ContractorStatus = {
  ENGAGED: "engaged",
  ON_HOLD: "on_hold",
  TERMINATED: "terminated",
} as const;

export type ContractorStatusType = (typeof ContractorStatus)[keyof typeof ContractorStatus];

// Contractor category enum (for Notion sync)
export const ContractorCategory = {
  SALES: "Sales Contractors",
  MARKETING: "Marketing Contractors",
  PRODUCT: "Product Contractors",
  OPERATIONS: "Operations Contractors",
  ENGINEERING: "Engineering Contractors",
  CONTENT: "Content",
} as const;

export type ContractorCategoryType = (typeof ContractorCategory)[keyof typeof ContractorCategory];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("ic"),
  jobTitle: text("job_title"),
  team: text("team"),
  supervisorId: varchar("supervisor_id"),
  managerId: varchar("manager_id"),
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  experienceLevel: integer("experience_level").default(1),
  contractorStatus: text("contractor_status").default("engaged"),
  contractorCategory: text("contractor_category"),
  hourlyRate: integer("hourly_rate"),
  monthlyCap: integer("monthly_cap"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  completedOnboarding: jsonb("completed_onboarding").default(sql`'{}'::jsonb`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OOO type enum
export const OOOType = {
  FULL_DAY: "full_day",
  HALF_DAY: "half_day",
} as const;

export type OOOTypeValue = (typeof OOOType)[keyof typeof OOOType];

// Out of Office Requests table
export const oooRequests = pgTable("ooo_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  managerId: varchar("manager_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  oooType: text("ooo_type").notNull().default("full_day"),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
});

export const insertOOORequestSchema = createInsertSchema(oooRequests).omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
});

export type InsertOOORequest = z.infer<typeof insertOOORequestSchema>;
export type OOORequest = typeof oooRequests.$inferSelect;

// Timesheets table (monthly)
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalHours: integer("total_hours").notNull().default(0),
  status: text("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  submittedAt: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
});

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

// Daily activity entries
export const dailyEntries = pgTable("daily_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").notNull(),
  date: date("date").notNull(),
  hours: integer("hours").notNull().default(0),
  activityLog: text("activity_log"),
});

export const insertDailyEntrySchema = createInsertSchema(dailyEntries).omit({
  id: true,
});

export type InsertDailyEntry = z.infer<typeof insertDailyEntrySchema>;
export type DailyEntry = typeof dailyEntries.$inferSelect;

// Overtime requests table (also used for weekend work approval)
export const overtimeRequests = pgTable("overtime_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  timesheetId: varchar("timesheet_id").notNull(),
  date: date("date").notNull(),
  requestedHours: integer("requested_hours").notNull(),
  approvedHours: integer("approved_hours"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  isWeekendWork: boolean("is_weekend_work").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  id: true,
  approvedHours: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
  createdAt: true,
});

export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  issueDate: date("issue_date").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  amount: integer("amount"),
  subtotal: integer("subtotal"),
  contractorName: text("contractor_name"),
  contractorAddress: text("contractor_address"),
  contractorPhone: text("contractor_phone"),
  contractorEmail: text("contractor_email"),
  contractorVatNo: text("contractor_vat_no"),
  billToName: text("bill_to_name"),
  billToAddress: text("bill_to_address"),
  billToVatNo: text("bill_to_vat_no"),
  bankDetails: text("bank_details"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending_review"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  timesheetId: varchar("timesheet_id"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  uploadedAt: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Invoice Line Items table
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  rate: integer("rate").notNull(),
  total: integer("total").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
});

export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

// IC Payment Details table (saveable bank details)
export const icPaymentDetails = pgTable("ic_payment_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  bankName: text("bank_name"),
  accountHolderFirstName: text("account_holder_first_name"),
  accountHolderLastName: text("account_holder_last_name"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  swiftCode: text("swift_code"),
  ibanNumber: text("iban_number"),
  accountType: text("account_type"),
  address: text("address"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIcPaymentDetailsSchema = createInsertSchema(icPaymentDetails).omit({
  id: true,
  updatedAt: true,
});

export type InsertIcPaymentDetails = z.infer<typeof insertIcPaymentDetailsSchema>;
export type IcPaymentDetails = typeof icPaymentDetails.$inferSelect;

// Evaluation status enum
export const EvaluationStatus = {
  DRAFT: "draft",
  IC_SUBMITTED: "ic_submitted",
  MANAGER_SUBMITTED: "manager_submitted",
  COMPLETED: "completed",
} as const;

export type EvaluationStatusType = (typeof EvaluationStatus)[keyof typeof EvaluationStatus];

// IC Responsibilities table (agreed expectations)
export const icResponsibilities = pgTable("ic_responsibilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  icId: varchar("ic_id").notNull(),
  responsibility: text("responsibility").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIcResponsibilitySchema = createInsertSchema(icResponsibilities).omit({
  id: true,
  createdAt: true,
});

export type InsertIcResponsibility = z.infer<typeof insertIcResponsibilitySchema>;
export type IcResponsibility = typeof icResponsibilities.$inferSelect;

// Evaluation outcome options
export const EVALUATION_OUTCOMES = [
  { value: "raise", label: "Received Raise" },
  { value: "bonus", label: "Bonus Awarded" },
  { value: "promoted", label: "Promoted" },
  { value: "title_change", label: "Title Change" },
  { value: "contract_extended", label: "Contract Extended" },
  { value: "pip", label: "Performance Improvement Plan" },
  { value: "demoted", label: "Demoted" },
  { value: "terminated", label: "Terminated" },
  { value: "no_change", label: "No Change" },
] as const;

export type EvaluationOutcome = typeof EVALUATION_OUTCOMES[number]["value"];

// Performance Evaluations table (enhanced)
export const evaluations = pgTable("evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  icId: varchar("ic_id").notNull(),
  managerId: varchar("manager_id").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  experienceLevelAtEval: integer("experience_level_at_eval"),
  newExperienceLevel: integer("new_experience_level"),
  overallSelfRating: integer("overall_self_rating"),
  overallManagerRating: integer("overall_manager_rating"),
  overallScore: integer("overall_score"),
  outcomes: text("outcomes").array(),
  expectationsForNextReview: text("expectations_for_next_review"),
  managerSummary: text("manager_summary"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  icSubmittedAt: timestamp("ic_submitted_at"),
  managerSubmittedAt: timestamp("manager_submitted_at"),
  completedAt: timestamp("completed_at"),
});

// Seniority Scale reference data
export const SENIORITY_SCALE = [
  {
    level: 1,
    reviewDependency: "Needs full review and rework",
    scopeOwnership: "Can follow instructions; cannot resolve ambiguity; handles only simple, isolated tasks",
    deadlineOwnership: "Needs close reminders and follow-up",
    collaborationLeadership: "Observes others; not yet a collaborator",
    inputRequired: "Requires exact tasks, templates, and step-by-step guidance",
    valueCreationAwareness: "Has no awareness of business value; focused solely on completing assigned tasks",
  },
  {
    level: 2,
    reviewDependency: "Needs regular review",
    scopeOwnership: "Can complete tasks with minimal ambiguity; contributes to pre-scoped projects",
    deadlineOwnership: "Usually meets deadlines with reminders; can't estimate scope yet",
    collaborationLeadership: "Starts contributing to small team rituals",
    inputRequired: "Needs clearly scoped tasks and support for prioritization",
    valueCreationAwareness: "Begins noticing the impact of their work; starts asking how their work connects to business goals",
  },
  {
    level: 3,
    reviewDependency: "Final output needs review; fewer iterations",
    scopeOwnership: "Solves well-scoped problems independently; owns tasks or simple features within a project",
    deadlineOwnership: "Tracks deadlines, communicates early; starts estimating own tasks",
    collaborationLeadership: "Participates in peer reviews, supports others occasionally",
    inputRequired: "Requires goals and rough scoping, self-manages execution",
    valueCreationAwareness: "Questions priorities if they don't seem valuable; gives feedback to improve impact",
  },
  {
    level: 4,
    reviewDependency: "Light review or alignment check",
    scopeOwnership: "Breaks down and leads medium-sized projects; scopes and owns features or initiatives",
    deadlineOwnership: "Proactively meets deadlines and estimates accurately for own work",
    collaborationLeadership: "Collaborates across disciplines, leads syncs",
    inputRequired: "Requires objective and context; defines and scopes own work",
    valueCreationAwareness: "Ensures what they and others work on creates measurable business value",
  },
  {
    level: 5,
    reviewDependency: "High trust; strategic feedback only",
    scopeOwnership: "Solves ambiguous problems; scopes and leads full projects across domains",
    deadlineOwnership: "Delivers consistently, estimates for self and others in planning",
    collaborationLeadership: "Mentors others, drives cross-functional work",
    inputRequired: "Requires outcome and constraints; creates plans",
    valueCreationAwareness: "Proactively identifies ways to unlock or scale business value",
  },
  {
    level: 6,
    reviewDependency: "Only high-level strategic review",
    scopeOwnership: "Identifies and defines domain-wide problems and opportunities; creates and leads roadmaps",
    deadlineOwnership: "Anticipates, scopes, and estimates timelines across multiple contributors",
    collaborationLeadership: "Leads multiple contributors across roles",
    inputRequired: "Needs business priorities; shapes roadmap and goals",
    valueCreationAwareness: "Shapes strategy to increase value across teams and product areas",
  },
  {
    level: 7,
    reviewDependency: "No review unless aligned with exec vision",
    scopeOwnership: "Discovers and frames org-level opportunities; drives long-term cross-domain strategy",
    deadlineOwnership: "Aligns, estimates, and adjusts timelines across teams and functions",
    collaborationLeadership: "Sets direction, coaches leaders, builds coalitions",
    inputRequired: "Requires mission and KPIs; defines strategy and structure",
    valueCreationAwareness: "Creates or redefines business models, priorities, or structures to unlock long-term value",
  },
] as const;

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  createdAt: true,
  icSubmittedAt: true,
  managerSubmittedAt: true,
  completedAt: true,
});

export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluations.$inferSelect;

// Evaluation sections - individual rating categories
export const evaluationSections = pgTable("evaluation_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evaluationId: varchar("evaluation_id").notNull(),
  sectionNumber: integer("section_number").notNull(),
  sectionName: text("section_name").notNull(),
  question: text("question").notNull(),
  selfRating: integer("self_rating"),
  selfDocumentation: text("self_documentation"),
  improvementGoal: text("improvement_goal"),
  managerRating: integer("manager_rating"),
  managerFeedback: text("manager_feedback"),
  founderFeedback: text("founder_feedback"),
});

export const insertEvaluationSectionSchema = createInsertSchema(evaluationSections).omit({
  id: true,
});

export type InsertEvaluationSection = z.infer<typeof insertEvaluationSectionSchema>;
export type EvaluationSection = typeof evaluationSections.$inferSelect;

// Default evaluation section templates
export const DEFAULT_EVALUATION_SECTIONS = [
  {
    sectionNumber: 1,
    sectionName: "Value Creation",
    question: "List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.",
  },
  {
    sectionNumber: 2,
    sectionName: "OKRs & Target Achievement",
    question: "Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.",
  },
  {
    sectionNumber: 3,
    sectionName: "Estimation & Deadlines",
    question: "For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.",
  },
  {
    sectionNumber: 4,
    sectionName: "Core Role",
    question: "How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?",
  },
  {
    sectionNumber: 5,
    sectionName: "Quality & Best Practices",
    question: "For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.",
  },
  {
    sectionNumber: 6,
    sectionName: "Initiative & Proactivity",
    question: "Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.",
  },
] as const;

// Feedback invitations for performance evaluations
export const feedbackInvitations = pgTable("feedback_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evaluationId: varchar("evaluation_id").notNull(),
  invitedById: varchar("invited_by_id").notNull(),
  invitedUserId: varchar("invited_user_id").notNull(),
  feedback: text("feedback"),
  rating: integer("rating"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertFeedbackInvitationSchema = createInsertSchema(feedbackInvitations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertFeedbackInvitation = z.infer<typeof insertFeedbackInvitationSchema>;
export type FeedbackInvitation = typeof feedbackInvitations.$inferSelect;

// Activity logs for admin/cofounder visibility
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Notification types enum
export const NotificationType = {
  OOO_SUBMITTED: "ooo_submitted",
  OOO_APPROVED: "ooo_approved",
  OOO_REJECTED: "ooo_rejected",
  TIMESHEET_SUBMITTED: "timesheet_submitted",
  TIMESHEET_APPROVED: "timesheet_approved",
  TIMESHEET_REJECTED: "timesheet_rejected",
  OVERTIME_SUBMITTED: "overtime_submitted",
  OVERTIME_APPROVED: "overtime_approved",
  OVERTIME_REJECTED: "overtime_rejected",
  INVOICE_UPLOADED: "invoice_uploaded",
  INVOICE_APPROVED: "invoice_approved",
  INVOICE_REJECTED: "invoice_rejected",
  INVOICE_REVISION_REQUESTED: "invoice_revision_requested",
  INVOICE_PROCESSED: "invoice_processed",
  DEADLINE_REMINDER: "deadline_reminder",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  EVALUATION_CREATED: "evaluation_created",
  EVALUATION_IC_SUBMITTED: "evaluation_ic_submitted",
  EVALUATION_COMPLETED: "evaluation_completed",
  EVALUATION_REMINDER: "evaluation_reminder",
  FEEDBACK_REQUESTED: "feedback_requested",
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actorId: varchar("actor_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Notification preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  oooNotifications: boolean("ooo_notifications").notNull().default(true),
  timesheetNotifications: boolean("timesheet_notifications").notNull().default(true),
  overtimeNotifications: boolean("overtime_notifications").notNull().default(true),
  invoiceNotifications: boolean("invoice_notifications").notNull().default(true),
  deadlineReminders: boolean("deadline_reminders").notNull().default(true),
  evaluationNotifications: boolean("evaluation_notifications").notNull().default(true),
  teamActionNotifications: boolean("team_action_notifications").notNull().default(true),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// Sessions table for persistent authentication
export const sessions = pgTable("sessions", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions);
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
