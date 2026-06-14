import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  expenses as expensesTable,
  activityLogs as activityLogsTable,
} from "@shared/schema";
import type { InsertExpense } from "@shared/schema";
import { ExpenseCategory, createExpenseBodySchema } from "@shared/schema";
import { validateBody } from "../middleware/validate";
import { parseBulkBody, runBulk } from "../bulkReview";
import {
  authMiddleware,
  asyncHandler,
} from "./shared";
import {
  notifyExpenseSubmitted,
  notifyExpenseApproved,
  notifyExpenseRejected,
} from "../notificationService";
import { normalizeFileUrl, uploadBase64ToObjectStorage, normalizeCurrencyInput } from "./helpers";

const VALID_EXPENSE_CATEGORIES = new Set<string>(Object.values(ExpenseCategory));

export function registerExpensesRoutes(app: Express): void {
  // -------------------------------------------------------------------------
  // Expense reimbursement routes
  // -------------------------------------------------------------------------

  // List expenses. Admins see org-wide (with optional userId filter); managers see team; ICs see own.
  app.get("/api/expenses", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const userIdParam = req.query.userId as string | undefined;
    const scope = req.query.scope as string | undefined;

    let list: any[] = [];

    if (scope === "team") {
      // Manager view: expenses where they are the reviewing manager
      list = await storage.getExpensesByManager(currentUser.id);
    } else if (userIdParam) {
      if (!isAdmin && userIdParam !== currentUser.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (isAdmin && userIdParam !== currentUser.id && currentUser.organizationId) {
        const target = await storage.getUser(userIdParam);
        if (!target || target.organizationId !== currentUser.organizationId) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      list = await storage.getExpensesByUser(userIdParam);
    } else if (isAdmin) {
      list = await storage.getAllExpenses(currentUser.organizationId ?? undefined);
    } else {
      list = await storage.getExpensesByUser(currentUser.id);
    }

    res.json(list.map((e) => ({ ...e, receiptUrl: normalizeFileUrl(e.receiptUrl) })));
  }));

  // Atomically link a set of approved expenses to a newly-created invoice.
  // The current user must own the expenses; already-linked or non-approved
  // expenses are silently skipped. Returns the list of expenses actually linked.
  app.post("/api/expenses/link-invoice", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { invoiceId, expenseIds } = req.body || {};
    if (!invoiceId || typeof invoiceId !== "string") {
      return res.status(400).json({ error: "invoiceId required" });
    }
    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.json({ linked: [] });
    }
    const ids = expenseIds.filter((id) => typeof id === "string");
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.userId !== currentUser.id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const linked = await storage.linkExpensesToInvoice(ids, invoiceId, currentUser.id);
    res.json({ linked });
  }));

  // Pending expense count for the sidebar/dashboard badge.
  // Admins see org-wide pending count; managers see expenses awaiting their review.
  app.get("/api/expenses/pending-count", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (isAdmin) {
      const all = await storage.getAllExpenses(currentUser.organizationId ?? undefined);
      const count = all.filter((e) => e.status === "pending").length;
      return res.json({ count });
    }
    const list = await storage.getPendingExpensesByManager(currentUser.id);
    res.json({ count: list.length });
  }));

  // Approved expenses available to add as line items on the IC's invoice for a given month/year
  app.get("/api/expenses/approved-for-invoice", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const monthRaw = req.query.month;
    const yearRaw = req.query.year;
    const month = parseInt(String(monthRaw ?? ""), 10);
    const year = parseInt(String(yearRaw ?? ""), 10);
    if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
      return res.status(400).json({ error: "Invalid month/year" });
    }
    const list = await storage.getApprovedExpensesForInvoice(currentUser.id, month, year);
    const available = list.filter((e) => !e.invoiceId);
    res.json(available.map((e) => ({ ...e, receiptUrl: normalizeFileUrl(e.receiptUrl) })));
  }));

  // Single expense
  app.get("/api/expenses/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const expense = await storage.getExpense(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isOwner = expense.userId === currentUser.id;
    const isManager = expense.managerId === currentUser.id;
    if (!isAdmin && !isOwner && !isManager) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (currentUser.organizationId && expense.organizationId && expense.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    res.json({ ...expense, receiptUrl: normalizeFileUrl(expense.receiptUrl) });
  }));

  // Create expense (IC submits). Admin can also submit on behalf if userId given.
  app.post("/api/expenses", authMiddleware, validateBody(createExpenseBodySchema), asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const {
      userId: bodyUserId,
      amount,
      currency,
      category,
      description,
      receiptUrl,
      receiptFileName,
      expenseDate,
    } = req.body || {};

    const targetUserId = bodyUserId && isAdmin ? String(bodyUserId) : currentUser.id;
    const owner = await storage.getUser(targetUserId);
    if (!owner) return res.status(404).json({ error: "User not found" });
    if (currentUser.organizationId && owner.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number (in cents)" });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!expenseDate || Number.isNaN(new Date(String(expenseDate)).getTime())) {
      return res.status(400).json({ error: "Invalid expense date" });
    }
    const categoryStr = String(category || "other").toLowerCase();
    if (!VALID_EXPENSE_CATEGORIES.has(categoryStr)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    const currencyCode = normalizeCurrencyInput(currency) || owner.currency || "USD";

    let storedReceiptUrl: string | null = null;
    let storedReceiptName: string | null = null;
    if (receiptUrl && typeof receiptUrl === "string") {
      const fileName = String(receiptFileName || "receipt");
      if (receiptUrl.startsWith("data:")) {
        const uploaded = await uploadBase64ToObjectStorage(receiptUrl, fileName);
        if (!uploaded) {
          return res.status(500).json({ error: "Failed to upload receipt" });
        }
        storedReceiptUrl = uploaded;
      } else {
        // Reject any non-data URL submitted by the client to prevent stored
        // javascript:/phishing URLs being rendered later in <a href>.
        return res.status(400).json({ error: "Invalid receipt upload" });
      }
      storedReceiptName = fileName;
    }

    const dateObj = new Date(String(expenseDate));
    const month = dateObj.getUTCMonth() + 1;
    const year = dateObj.getUTCFullYear();

    const insertPayload: InsertExpense = {
      organizationId: owner.organizationId ?? null,
      userId: owner.id,
      managerId: owner.supervisorId || owner.managerId || null,
      amount: Math.round(amountNum),
      currency: currencyCode,
      category: categoryStr,
      description: description.trim(),
      receiptUrl: storedReceiptUrl,
      receiptFileName: storedReceiptName,
      expenseDate: String(expenseDate),
      month,
      year,
      status: "pending",
    };

    const created = await storage.createExpense(insertPayload);

    await storage.createActivityLog({
      userId: currentUser.id,
      organizationId: currentUser.organizationId,
      action: "Expense submitted",
      details: `${owner.firstName} ${owner.lastName} submitted a ${categoryStr} expense for ${currencyCode} ${(amountNum / 100).toFixed(2)}`,
      entityType: "expense",
      entityId: created.id,
    });

    notifyExpenseSubmitted(created, owner).catch((err) =>
      console.error("notifyExpenseSubmitted failed:", err)
    );

    res.status(201).json({ ...created, receiptUrl: normalizeFileUrl(created.receiptUrl) });
  }));

  // Approve / reject expense
  app.patch("/api/expenses/:id/review", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const expense = await storage.getExpense(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isManager = expense.managerId === currentUser.id;
    if (!isAdmin && !isManager) {
      return res.status(403).json({ error: "Not authorized to review this expense" });
    }
    if (currentUser.organizationId && expense.organizationId && expense.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (expense.status !== "pending") {
      return res.status(400).json({ error: "Expense has already been reviewed" });
    }

    const { status, reviewNote } = req.body || {};
    const statusStr = String(status || "").toLowerCase();
    if (statusStr !== "approved" && statusStr !== "rejected") {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    const updated = await storage.updateExpense(expense.id, {
      status: statusStr,
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ? String(reviewNote) : null,
    });
    if (!updated) return res.status(500).json({ error: "Failed to update expense" });

    const submitter = await storage.getUser(expense.userId);

    await storage.createActivityLog({
      userId: currentUser.id,
      organizationId: currentUser.organizationId,
      action: statusStr === "approved" ? "Expense approved" : "Expense rejected",
      details: submitter
        ? `${statusStr === "approved" ? "Approved" : "Rejected"} expense for ${submitter.firstName} ${submitter.lastName}`
        : `Reviewed expense ${expense.id}`,
      entityType: "expense",
      entityId: expense.id,
    });

    if (statusStr === "approved") {
      notifyExpenseApproved(updated, currentUser).catch((err) =>
        console.error("notifyExpenseApproved failed:", err)
      );
    } else {
      notifyExpenseRejected(updated, currentUser, reviewNote ? String(reviewNote) : undefined).catch((err) =>
        console.error("notifyExpenseRejected failed:", err)
      );
    }

    res.json({ ...updated, receiptUrl: normalizeFileUrl(updated.receiptUrl) });
  }));

  // Delete expense (only owner while pending, or admin)
  app.delete("/api/expenses/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const expense = await storage.getExpense(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isOwner = expense.userId === currentUser.id;
    if (!isAdmin && !(isOwner && expense.status === "pending")) {
      return res.status(403).json({ error: "Not authorized to delete this expense" });
    }
    if (currentUser.organizationId && expense.organizationId && expense.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const success = await storage.deleteExpense(expense.id);
    if (!success) return res.status(500).json({ error: "Failed to delete expense" });

    await storage.createActivityLog({
      userId: currentUser.id,
      organizationId: currentUser.organizationId,
      action: "Expense deleted",
      details: `Deleted expense for ${expense.currency} ${(expense.amount / 100).toFixed(2)}`,
      entityType: "expense",
      entityId: expense.id,
    });

    res.status(204).send();
  }));

  // Bulk: expenses
  app.post("/api/expenses/bulk-review", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const parsed = parseBulkBody(req.body);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    const { ids, status, reviewNote } = parsed;

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    const summary = await runBulk(ids, async (id) => {
      const expense = await storage.getExpense(id);
      if (!expense) throw new Error("Expense not found");
      if (currentUser.organizationId && expense.organizationId && expense.organizationId !== currentUser.organizationId) {
        throw new Error("Not authorized");
      }
      if (!isAdmin && expense.managerId !== currentUser.id) {
        throw new Error("Not authorized to review this expense");
      }
      if (expense.status !== "pending") {
        throw new Error("Expense has already been reviewed");
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(expensesTable)
          .set({
            status,
            reviewedBy: currentUser.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          })
          .where(eq(expensesTable.id, id))
          .returning();
        if (!row) throw new Error("Failed to update expense");
        await tx.insert(activityLogsTable).values({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: status === "approved" ? "Expense approved" : "Expense rejected",
          details: `${status === "approved" ? "Approved" : "Rejected"} expense ${expense.id}${reviewNote ? `: ${reviewNote}` : ""}`,
          entityType: "expense",
          entityId: id,
        });
        return row;
      });

      try {
        if (status === "approved") {
          await notifyExpenseApproved(updated, currentUser);
        } else {
          await notifyExpenseRejected(updated, currentUser, reviewNote ?? undefined);
        }
      } catch (e) {
        console.error("Notification failed:", e);
      }
    });

    // Always write bulk summary, even on full failure, for audit traceability.
    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `Bulk expense ${status}`,
        details: `Bulk action by ${currentUser.firstName} ${currentUser.lastName}: ${status} ${summary.successCount} of ${ids.length} expenses (${summary.failureCount} failed)`,
        entityType: "expense",
        // entityId omitted: bulk summary spans multiple records
      });
    } catch {}

    res.json(summary);
  }));
}
