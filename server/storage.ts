import {
  type User,
  type InsertUser,
  type OOORequest,
  type InsertOOORequest,
  type Timesheet,
  type InsertTimesheet,
  type DailyEntry,
  type InsertDailyEntry,
  type OvertimeRequest,
  type InsertOvertimeRequest,
  type Invoice,
  type InsertInvoice,
  type InvoiceLineItem,
  type InsertInvoiceLineItem,
  type IcPaymentDetails,
  type InsertIcPaymentDetails,
  type Evaluation,
  type InsertEvaluation,
  type EvaluationSection,
  type InsertEvaluationSection,
  type IcResponsibility,
  type InsertIcResponsibility,
  type FeedbackInvitation,
  type InsertFeedbackInvitation,
  type ActivityLog,
  type InsertActivityLog,
  type Notification,
  type InsertNotification,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type Organization,
  type InsertOrganization,
  type Subscription,
  type InsertSubscription,
  type Contract,
  type InsertContract,
  type Expense,
  type InsertExpense,
  contracts,
  expenses,
  users,
  oooRequests,
  timesheets,
  dailyEntries,
  overtimeRequests,
  invoices,
  invoiceLineItems,
  icPaymentDetails,
  icResponsibilities,
  evaluations,
  evaluationSections,
  feedbackInvitations,
  activityLogs,
  notifications,
  notificationPreferences,
  organizations,
  subscriptions,
  UserRole,
  DEFAULT_EVALUATION_SECTIONS,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(organizationId?: string): Promise<User[]>;
  getUsersByRole(role: string, organizationId?: string): Promise<User[]>;
  getUsersBySupervisor(supervisorId: string): Promise<User[]>;
  getManagers(organizationId?: string): Promise<User[]>;
  getSupervisors(organizationId?: string): Promise<User[]>;

  getOOORequest(id: string): Promise<OOORequest | undefined>;
  getOOORequestsByUser(userId: string): Promise<OOORequest[]>;
  getOOORequestsByManager(managerId: string): Promise<OOORequest[]>;
  getPendingOOORequests(organizationId?: string): Promise<OOORequest[]>;
  getAllOOORequests(organizationId?: string): Promise<OOORequest[]>;
  createOOORequest(request: InsertOOORequest): Promise<OOORequest>;
  updateOOORequest(id: string, updates: Partial<OOORequest>): Promise<OOORequest | undefined>;

  getTimesheet(id: string): Promise<Timesheet | undefined>;
  getTimesheetByUserAndMonth(userId: string, month: number, year: number): Promise<Timesheet | undefined>;
  getTimesheetsByUser(userId: string): Promise<Timesheet[]>;
  getSubmittedTimesheets(organizationId?: string): Promise<Timesheet[]>;
  getAllTimesheets(organizationId?: string): Promise<Timesheet[]>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: string, updates: Partial<Timesheet>): Promise<Timesheet | undefined>;

  getDailyEntriesByTimesheet(timesheetId: string): Promise<DailyEntry[]>;
  getDailyEntryByTimesheetAndDate(timesheetId: string, date: string): Promise<DailyEntry | undefined>;
  createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry>;
  updateDailyEntry(id: string, updates: Partial<DailyEntry>): Promise<DailyEntry | undefined>;
  deleteDailyEntriesByTimesheet(timesheetId: string): Promise<void>;

  getOvertimeRequest(id: string): Promise<OvertimeRequest | undefined>;
  getOvertimeRequestsByUser(userId: string): Promise<OvertimeRequest[]>;
  getOvertimeRequestsByTimesheet(timesheetId: string): Promise<OvertimeRequest[]>;
  getPendingOvertimeRequests(organizationId?: string): Promise<OvertimeRequest[]>;
  getAllOvertimeRequests(organizationId?: string): Promise<OvertimeRequest[]>;
  createOvertimeRequest(request: InsertOvertimeRequest): Promise<OvertimeRequest>;
  updateOvertimeRequest(id: string, updates: Partial<OvertimeRequest>): Promise<OvertimeRequest | undefined>;
  getOvertimeRequestByDateAndUser(userId: string, date: string): Promise<OvertimeRequest | undefined>;
  getOvertimeRequestByTimesheetAndDate(timesheetId: string, date: string): Promise<OvertimeRequest | undefined>;

  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByUser(userId: string): Promise<Invoice[]>;
  getAllInvoices(organizationId?: string): Promise<Invoice[]>;
  getPendingInvoices(organizationId?: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getNextInvoiceNumber(userId: string): Promise<string>;

  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  deleteInvoiceLineItems(invoiceId: string): Promise<void>;

  getIcPaymentDetails(userId: string): Promise<IcPaymentDetails | undefined>;
  createIcPaymentDetails(details: InsertIcPaymentDetails): Promise<IcPaymentDetails>;
  updateIcPaymentDetails(userId: string, updates: Partial<IcPaymentDetails>): Promise<IcPaymentDetails | undefined>;

  getIcResponsibilities(icId: string): Promise<IcResponsibility[]>;
  createIcResponsibility(responsibility: InsertIcResponsibility): Promise<IcResponsibility>;
  updateIcResponsibility(id: string, updates: Partial<IcResponsibility>): Promise<IcResponsibility | undefined>;
  deleteIcResponsibility(id: string): Promise<boolean>;

  getEvaluation(id: string): Promise<Evaluation | undefined>;
  getEvaluationsByManager(managerId: string): Promise<Evaluation[]>;
  getEvaluationsByIC(icId: string): Promise<Evaluation[]>;
  getAllEvaluations(organizationId?: string): Promise<Evaluation[]>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  updateEvaluation(id: string, updates: Partial<Evaluation>): Promise<Evaluation | undefined>;
  getLastCompletedEvaluation(icId: string): Promise<Evaluation | undefined>;

  getEvaluationSections(evaluationId: string): Promise<EvaluationSection[]>;
  createEvaluationSection(section: InsertEvaluationSection): Promise<EvaluationSection>;
  updateEvaluationSection(id: string, updates: Partial<EvaluationSection>): Promise<EvaluationSection | undefined>;
  createDefaultSectionsForEvaluation(evaluationId: string): Promise<EvaluationSection[]>;

  getFeedbackInvitation(id: string): Promise<FeedbackInvitation | undefined>;
  getFeedbackInvitationsByEvaluation(evaluationId: string): Promise<FeedbackInvitation[]>;
  createFeedbackInvitation(invitation: InsertFeedbackInvitation): Promise<FeedbackInvitation>;
  updateFeedbackInvitation(id: string, updates: Partial<FeedbackInvitation>): Promise<FeedbackInvitation | undefined>;

  getActivityLogs(organizationId?: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | undefined>;

  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | undefined>;

  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  getSubscriptionByOrganization(organizationId: string): Promise<Subscription | undefined>;
  updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCountByOrganization(organizationId: string): Promise<number>;

  getContract(id: string): Promise<Contract | undefined>;
  getContractsByUser(userId: string): Promise<Contract[]>;
  getAllContracts(organizationId?: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  deleteContract(id: string): Promise<boolean>;
  updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined>;

  getExpense(id: string): Promise<Expense | undefined>;
  getExpensesByUser(userId: string): Promise<Expense[]>;
  getExpensesByManager(managerId: string): Promise<Expense[]>;
  getPendingExpensesByManager(managerId: string): Promise<Expense[]>;
  getAllExpenses(organizationId?: string): Promise<Expense[]>;
  getApprovedExpensesForInvoice(userId: string, month: number, year: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  linkExpensesToInvoice(expenseIds: string[], invoiceId: string, userId: string): Promise<Expense[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(insertUser.password);
    const result = await db.insert(users).values({ ...insertUser, password: hashedPassword }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(organizationId?: string): Promise<User[]> {
    if (organizationId) {
      return db.select().from(users).where(eq(users.organizationId, organizationId));
    }
    return db.select().from(users);
  }

  async getUsersByRole(role: string, organizationId?: string): Promise<User[]> {
    if (organizationId) {
      return db.select().from(users).where(and(eq(users.role, role), eq(users.organizationId, organizationId)));
    }
    return db.select().from(users).where(eq(users.role, role));
  }

  async getUsersBySupervisor(supervisorId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.supervisorId, supervisorId));
  }

  async getManagers(organizationId?: string): Promise<User[]> {
    const allUsers = organizationId
      ? await db.select().from(users).where(eq(users.organizationId, organizationId))
      : await db.select().from(users);
    const admins = allUsers.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.OWNER);
    
    const supervisorIds = new Set(allUsers.filter(u => u.supervisorId).map(u => u.supervisorId));
    const icSupervisors = allUsers.filter(u => u.role === UserRole.IC && supervisorIds.has(u.id));
    
    const managerMap = new Map<string, User>();
    [...admins, ...icSupervisors].forEach(u => managerMap.set(u.id, u));
    return Array.from(managerMap.values());
  }

  async getSupervisors(organizationId?: string): Promise<User[]> {
    if (organizationId) {
      return db.select().from(users).where(eq(users.organizationId, organizationId));
    }
    return db.select().from(users);
  }

  async getOOORequest(id: string): Promise<OOORequest | undefined> {
    const result = await db.select().from(oooRequests).where(eq(oooRequests.id, id));
    return result[0];
  }

  async getOOORequestsByUser(userId: string): Promise<OOORequest[]> {
    return db.select().from(oooRequests).where(eq(oooRequests.userId, userId));
  }

  async getOOORequestsByManager(managerId: string): Promise<OOORequest[]> {
    return db.select().from(oooRequests).where(eq(oooRequests.managerId, managerId));
  }

  async getPendingOOORequests(organizationId?: string): Promise<OOORequest[]> {
    if (organizationId) {
      return db.select().from(oooRequests).where(and(eq(oooRequests.status, "pending"), eq(oooRequests.organizationId, organizationId)));
    }
    return db.select().from(oooRequests).where(eq(oooRequests.status, "pending"));
  }

  async getAllOOORequests(organizationId?: string): Promise<OOORequest[]> {
    if (organizationId) {
      return db.select().from(oooRequests).where(eq(oooRequests.organizationId, organizationId));
    }
    return db.select().from(oooRequests);
  }

  async createOOORequest(request: InsertOOORequest): Promise<OOORequest> {
    const result = await db.insert(oooRequests).values(request).returning();
    return result[0];
  }

  async updateOOORequest(id: string, updates: Partial<OOORequest>): Promise<OOORequest | undefined> {
    const result = await db.update(oooRequests).set(updates).where(eq(oooRequests.id, id)).returning();
    return result[0];
  }

  async getTimesheet(id: string): Promise<Timesheet | undefined> {
    const result = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return result[0];
  }

  async getTimesheetByUserAndMonth(userId: string, month: number, year: number): Promise<Timesheet | undefined> {
    const result = await db.select().from(timesheets).where(
      and(
        eq(timesheets.userId, userId),
        eq(timesheets.month, month),
        eq(timesheets.year, year)
      )
    );
    return result[0];
  }

  async getTimesheetsByUser(userId: string): Promise<Timesheet[]> {
    return db.select().from(timesheets).where(eq(timesheets.userId, userId));
  }

  async getSubmittedTimesheets(organizationId?: string): Promise<Timesheet[]> {
    if (organizationId) {
      return db.select().from(timesheets).where(and(eq(timesheets.status, "submitted"), eq(timesheets.organizationId, organizationId)));
    }
    return db.select().from(timesheets).where(eq(timesheets.status, "submitted"));
  }

  async getAllTimesheets(organizationId?: string): Promise<Timesheet[]> {
    if (organizationId) {
      return db.select().from(timesheets).where(eq(timesheets.organizationId, organizationId));
    }
    return db.select().from(timesheets);
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const result = await db.insert(timesheets).values(timesheet).returning();
    return result[0];
  }

  async updateTimesheet(id: string, updates: Partial<Timesheet>): Promise<Timesheet | undefined> {
    const result = await db.update(timesheets).set(updates).where(eq(timesheets.id, id)).returning();
    return result[0];
  }

  async getDailyEntriesByTimesheet(timesheetId: string): Promise<DailyEntry[]> {
    return db.select().from(dailyEntries).where(eq(dailyEntries.timesheetId, timesheetId));
  }

  async getDailyEntryByTimesheetAndDate(timesheetId: string, date: string): Promise<DailyEntry | undefined> {
    const result = await db.select().from(dailyEntries).where(
      and(
        eq(dailyEntries.timesheetId, timesheetId),
        eq(dailyEntries.date, date)
      )
    );
    return result[0];
  }

  async createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry> {
    const result = await db.insert(dailyEntries).values(entry).returning();
    return result[0];
  }

  async updateDailyEntry(id: string, updates: Partial<DailyEntry>): Promise<DailyEntry | undefined> {
    const result = await db.update(dailyEntries).set(updates).where(eq(dailyEntries.id, id)).returning();
    return result[0];
  }

  async deleteDailyEntriesByTimesheet(timesheetId: string): Promise<void> {
    await db.delete(dailyEntries).where(eq(dailyEntries.timesheetId, timesheetId));
  }

  async getOvertimeRequest(id: string): Promise<OvertimeRequest | undefined> {
    const result = await db.select().from(overtimeRequests).where(eq(overtimeRequests.id, id));
    return result[0];
  }

  async getOvertimeRequestsByUser(userId: string): Promise<OvertimeRequest[]> {
    return db.select().from(overtimeRequests).where(eq(overtimeRequests.userId, userId));
  }

  async getOvertimeRequestsByTimesheet(timesheetId: string): Promise<OvertimeRequest[]> {
    return db.select().from(overtimeRequests).where(eq(overtimeRequests.timesheetId, timesheetId));
  }

  async getPendingOvertimeRequests(organizationId?: string): Promise<OvertimeRequest[]> {
    if (organizationId) {
      return db.select().from(overtimeRequests).where(and(eq(overtimeRequests.status, "pending"), eq(overtimeRequests.organizationId, organizationId)));
    }
    return db.select().from(overtimeRequests).where(eq(overtimeRequests.status, "pending"));
  }

  async getAllOvertimeRequests(organizationId?: string): Promise<OvertimeRequest[]> {
    if (organizationId) {
      return db.select().from(overtimeRequests).where(eq(overtimeRequests.organizationId, organizationId));
    }
    return db.select().from(overtimeRequests);
  }

  async createOvertimeRequest(request: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const result = await db.insert(overtimeRequests).values(request).returning();
    return result[0];
  }

  async updateOvertimeRequest(id: string, updates: Partial<OvertimeRequest>): Promise<OvertimeRequest | undefined> {
    const result = await db.update(overtimeRequests).set(updates).where(eq(overtimeRequests.id, id)).returning();
    return result[0];
  }

  async getOvertimeRequestByDateAndUser(userId: string, date: string): Promise<OvertimeRequest | undefined> {
    const result = await db.select().from(overtimeRequests).where(
      and(
        eq(overtimeRequests.userId, userId),
        eq(overtimeRequests.date, date)
      )
    );
    return result[0];
  }

  async getOvertimeRequestByTimesheetAndDate(timesheetId: string, date: string): Promise<OvertimeRequest | undefined> {
    const result = await db.select().from(overtimeRequests).where(
      and(
        eq(overtimeRequests.timesheetId, timesheetId),
        eq(overtimeRequests.date, date)
      )
    );
    return result[0];
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0];
  }

  async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.uploadedAt));
  }

  async getAllInvoices(organizationId?: string): Promise<Invoice[]> {
    if (organizationId) {
      return db.select().from(invoices).where(eq(invoices.organizationId, organizationId)).orderBy(desc(invoices.uploadedAt));
    }
    return db.select().from(invoices).orderBy(desc(invoices.uploadedAt));
  }

  async getPendingInvoices(organizationId?: string): Promise<Invoice[]> {
    if (organizationId) {
      return db.select().from(invoices).where(and(eq(invoices.status, "pending_review"), eq(invoices.organizationId, organizationId))).orderBy(desc(invoices.uploadedAt));
    }
    return db.select().from(invoices).where(eq(invoices.status, "pending_review")).orderBy(desc(invoices.uploadedAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return result[0];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await this.deleteInvoiceLineItems(id);
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }

  async getNextInvoiceNumber(userId: string): Promise<string> {
    const userInvoices = await this.getInvoicesByUser(userId);
    const year = new Date().getFullYear();
    const count = userInvoices.filter(i => i.year === year).length + 1;
    return `INV-${year}-${count.toString().padStart(3, "0")}`;
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  async createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const result = await db.insert(invoiceLineItems).values(lineItem).returning();
    return result[0];
  }

  async deleteInvoiceLineItems(invoiceId: string): Promise<void> {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  async getIcPaymentDetails(userId: string): Promise<IcPaymentDetails | undefined> {
    const result = await db.select().from(icPaymentDetails).where(eq(icPaymentDetails.userId, userId));
    return result[0];
  }

  async createIcPaymentDetails(details: InsertIcPaymentDetails): Promise<IcPaymentDetails> {
    const result = await db.insert(icPaymentDetails).values(details).returning();
    return result[0];
  }

  async updateIcPaymentDetails(userId: string, updates: Partial<IcPaymentDetails>): Promise<IcPaymentDetails | undefined> {
    const result = await db.update(icPaymentDetails).set(updates).where(eq(icPaymentDetails.userId, userId)).returning();
    return result[0];
  }

  async getIcResponsibilities(icId: string): Promise<IcResponsibility[]> {
    return db.select().from(icResponsibilities).where(eq(icResponsibilities.icId, icId));
  }

  async createIcResponsibility(responsibility: InsertIcResponsibility): Promise<IcResponsibility> {
    const result = await db.insert(icResponsibilities).values(responsibility).returning();
    return result[0];
  }

  async updateIcResponsibility(id: string, updates: Partial<IcResponsibility>): Promise<IcResponsibility | undefined> {
    const result = await db.update(icResponsibilities).set(updates).where(eq(icResponsibilities.id, id)).returning();
    return result[0];
  }

  async deleteIcResponsibility(id: string): Promise<boolean> {
    const result = await db.delete(icResponsibilities).where(eq(icResponsibilities.id, id)).returning();
    return result.length > 0;
  }

  async getEvaluation(id: string): Promise<Evaluation | undefined> {
    const result = await db.select().from(evaluations).where(eq(evaluations.id, id));
    return result[0];
  }

  async getEvaluationsByManager(managerId: string): Promise<Evaluation[]> {
    return db.select().from(evaluations).where(eq(evaluations.managerId, managerId));
  }

  async getEvaluationsByIC(icId: string): Promise<Evaluation[]> {
    return db.select().from(evaluations).where(eq(evaluations.icId, icId));
  }

  async getAllEvaluations(organizationId?: string): Promise<Evaluation[]> {
    if (organizationId) {
      return db.select().from(evaluations).where(eq(evaluations.organizationId, organizationId));
    }
    return db.select().from(evaluations);
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const result = await db.insert(evaluations).values(evaluation).returning();
    return result[0];
  }

  async updateEvaluation(id: string, updates: Partial<Evaluation>): Promise<Evaluation | undefined> {
    const result = await db.update(evaluations).set(updates).where(eq(evaluations.id, id)).returning();
    return result[0];
  }

  async getLastCompletedEvaluation(icId: string): Promise<Evaluation | undefined> {
    const result = await db.select().from(evaluations)
      .where(and(eq(evaluations.icId, icId), eq(evaluations.status, "completed")))
      .orderBy(desc(evaluations.completedAt))
      .limit(1);
    return result[0];
  }

  async getEvaluationSections(evaluationId: string): Promise<EvaluationSection[]> {
    return db.select().from(evaluationSections).where(eq(evaluationSections.evaluationId, evaluationId));
  }

  async createEvaluationSection(section: InsertEvaluationSection): Promise<EvaluationSection> {
    const result = await db.insert(evaluationSections).values(section).returning();
    return result[0];
  }

  async updateEvaluationSection(id: string, updates: Partial<EvaluationSection>): Promise<EvaluationSection | undefined> {
    const result = await db.update(evaluationSections).set(updates).where(eq(evaluationSections.id, id)).returning();
    return result[0];
  }

  async createDefaultSectionsForEvaluation(evaluationId: string): Promise<EvaluationSection[]> {
    const sections: EvaluationSection[] = [];
    for (const template of DEFAULT_EVALUATION_SECTIONS) {
      const section = await this.createEvaluationSection({
        evaluationId,
        sectionNumber: template.sectionNumber,
        sectionName: template.sectionName,
        question: template.question,
      });
      sections.push(section);
    }
    return sections;
  }

  async getFeedbackInvitation(id: string): Promise<FeedbackInvitation | undefined> {
    const result = await db.select().from(feedbackInvitations).where(eq(feedbackInvitations.id, id));
    return result[0];
  }

  async getFeedbackInvitationsByEvaluation(evaluationId: string): Promise<FeedbackInvitation[]> {
    return db.select().from(feedbackInvitations).where(eq(feedbackInvitations.evaluationId, evaluationId));
  }

  async createFeedbackInvitation(invitation: InsertFeedbackInvitation): Promise<FeedbackInvitation> {
    const result = await db.insert(feedbackInvitations).values(invitation).returning();
    return result[0];
  }

  async updateFeedbackInvitation(id: string, updates: Partial<FeedbackInvitation>): Promise<FeedbackInvitation | undefined> {
    const result = await db.update(feedbackInvitations).set(updates).where(eq(feedbackInvitations.id, id)).returning();
    return result[0];
  }

  async getActivityLogs(organizationId?: string): Promise<ActivityLog[]> {
    if (organizationId) {
      return db.select().from(activityLogs).where(eq(activityLogs.organizationId, organizationId)).orderBy(desc(activityLogs.createdAt));
    }
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLogs).values(log).returning();
    return result[0];
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0];
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    ).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const unread = await this.getUnreadNotificationsByUser(userId);
    return unread.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return result[0];
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return result[0];
  }

  async createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const result = await db.insert(notificationPreferences).values(prefs).returning();
    return result[0];
  }

  async updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | undefined> {
    const result = await db.update(notificationPreferences).set(updates).where(eq(notificationPreferences.userId, userId)).returning();
    return result[0];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(org).returning();
    return result[0];
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id));
    return result[0];
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return result[0];
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const result = await db.insert(subscriptions).values(sub).returning();
    return result[0];
  }

  async getSubscriptionByOrganization(organizationId: string): Promise<Subscription | undefined> {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | undefined> {
    const result = await db.update(organizations).set(updates).where(eq(organizations.id, id)).returning();
    return result[0];
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const result = await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id)).returning();
    return result[0];
  }

  async getUserCountByOrganization(organizationId: string): Promise<number> {
    const result = await db.select().from(users).where(eq(users.organizationId, organizationId));
    return result.length;
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0];
  }

  async getContractsByUser(userId: string): Promise<Contract[]> {
    return db.select().from(contracts).where(eq(contracts.userId, userId)).orderBy(desc(contracts.createdAt));
  }

  async getAllContracts(organizationId?: string): Promise<Contract[]> {
    if (organizationId) {
      return db.select().from(contracts).where(eq(contracts.organizationId, organizationId)).orderBy(desc(contracts.createdAt));
    }
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const result = await db.insert(contracts).values(contract).returning();
    return result[0];
  }

  async deleteContract(id: string): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return result.length > 0;
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined> {
    const result = await db.update(contracts).set(updates).where(eq(contracts.id, id)).returning();
    return result[0];
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id));
    return result[0];
  }

  async getExpensesByUser(userId: string): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.createdAt));
  }

  async getExpensesByManager(managerId: string): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.managerId, managerId)).orderBy(desc(expenses.createdAt));
  }

  async getPendingExpensesByManager(managerId: string): Promise<Expense[]> {
    return db.select().from(expenses).where(
      and(eq(expenses.managerId, managerId), eq(expenses.status, "pending"))
    ).orderBy(desc(expenses.createdAt));
  }

  async getAllExpenses(organizationId?: string): Promise<Expense[]> {
    if (organizationId) {
      return db.select().from(expenses).where(eq(expenses.organizationId, organizationId)).orderBy(desc(expenses.createdAt));
    }
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async getApprovedExpensesForInvoice(userId: string, month: number, year: number): Promise<Expense[]> {
    return db.select().from(expenses).where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.month, month),
        eq(expenses.year, year),
        eq(expenses.status, "approved"),
      )
    ).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined> {
    const result = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  async linkExpensesToInvoice(expenseIds: string[], invoiceId: string, userId: string): Promise<Expense[]> {
    if (expenseIds.length === 0) return [];
    const result = await db
      .update(expenses)
      .set({ invoiceId, invoicedAt: new Date() })
      .where(
        and(
          inArray(expenses.id, expenseIds),
          eq(expenses.userId, userId),
          eq(expenses.status, "approved"),
          isNull(expenses.invoiceId),
        )
      )
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
