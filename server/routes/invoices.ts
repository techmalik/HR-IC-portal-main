import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { invoices as invoicesTable, activityLogs as activityLogsTable } from "@shared/schema";
import {
  authMiddleware,
  requireRole,
  asyncHandler,
  hasSupervisorPrivileges,
  checkOrgBoundary,
  getTeamMemberIds,
} from "./shared";
import { normalizeCurrencyInput, normalizeFileUrl, uploadBase64ToObjectStorage } from "./helpers";
import { parseBulkBody, runBulk } from "../bulkReview";
import {
  notifyInvoiceUploaded,
  notifyInvoiceApproved,
  notifyInvoiceRejected,
  notifyInvoiceRevisionRequested,
  notifyInvoicePaid,
  notifyTimesheetApproved,
} from "../notificationService";

export function registerInvoiceRoutes(app: Express): void {
  app.get("/api/invoices", authMiddleware, async (req, res) => {
    const { userId } = req.query;
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    let invoiceList;
    if (userId) {
      const targetUserId = userId as string;
      if (isAdmin) {
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
          return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
        }
      } else if (currentUser.id !== targetUserId) {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(targetUserId)) {
          return res.status(403).json({ error: "Forbidden - Cannot access invoices for this user" });
        }
      }
      invoiceList = await storage.getInvoicesByUser(targetUserId);
    } else {
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
      invoiceList = await storage.getAllInvoices(currentUser.organizationId ?? undefined);
    }

    const enrichedInvoices = await Promise.all(
      invoiceList.map(async (invoice) => {
        const invoiceUser = await storage.getUser(invoice.userId);
        const timesheet = invoice.timesheetId
          ? await storage.getTimesheet(invoice.timesheetId)
          : null;
        return {
          ...invoice,
          fileUrl: normalizeFileUrl(invoice.fileUrl),
          user: invoiceUser ? {
            id: invoiceUser.id,
            firstName: invoiceUser.firstName,
            lastName: invoiceUser.lastName,
            email: invoiceUser.email,
          } : null,
          timesheet,
        };
      })
    );

    res.json(enrichedInvoices);
  });

  app.post("/api/invoices", authMiddleware, async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const { month, year } = req.body;

      // Invoices are always created by the contractor for themselves.
      const userId = currentUser.id;

      const timesheet = await storage.getTimesheetByUserAndMonth(userId, month, year);

      let invoiceCurrency = normalizeCurrencyInput(req.body.currency) || "";
      if (!invoiceCurrency) {
        invoiceCurrency = normalizeCurrencyInput(currentUser.currency) || "USD";
      }

      const {
        invoiceNumber, issueDate, fileName, fileUrl, amount, subtotal,
        contractorName, contractorAddress, contractorPhone, contractorEmail,
        contractorVatNo, billToName, billToAddress, billToVatNo, bankDetails,
      } = req.body;

      const invoiceData = {
        userId,
        invoiceNumber,
        month,
        year,
        issueDate,
        fileName,
        fileUrl,
        amount,
        subtotal,
        contractorName,
        contractorAddress,
        contractorPhone,
        contractorEmail,
        contractorVatNo,
        billToName,
        billToAddress,
        billToVatNo,
        bankDetails,
        currency: invoiceCurrency,
        status: "pending_review" as const,
        timesheetId: timesheet?.id || null,
        organizationId: currentUser.organizationId,
      };

      const { invoice, timesheetSubmitted } = await storage.createInvoiceAndSubmitTimesheet(
        invoiceData,
        timesheet?.id ?? null,
      );

      if (timesheetSubmitted && timesheet) {
        await storage.createActivityLog({
          userId,
          organizationId: req.authenticatedUser!.organizationId,
          action: "Timesheet auto-submitted",
          details: `Timesheet for ${month}/${year} submitted for approval with invoice`,
          entityType: "timesheet",
          entityId: timesheet.id,
        });
      }

      await storage.createActivityLog({
        userId,
        organizationId: currentUser.organizationId,
        action: "Invoice submitted for review",
        details: `Submitted invoice ${fileName || invoice.fileName} for approval`,
        entityType: "invoice",
        entityId: invoice.id,
      });

      const uploader = await storage.getUser(invoice.userId);
      if (uploader) {
        await notifyInvoiceUploaded(invoice, uploader);
      }

      let finalFileUrl = invoice.fileUrl;
      if (invoice.fileUrl && invoice.fileUrl.startsWith("data:")) {
        const uploadedUrl = await uploadBase64ToObjectStorage(
          invoice.fileUrl,
          invoice.fileName
        );
        if (!uploadedUrl) {
          await storage.deleteInvoice(invoice.id);
          return res.status(500).json({ error: "Failed to upload invoice file to storage" });
        }
        await storage.updateInvoice(invoice.id, { fileUrl: uploadedUrl });
        finalFileUrl = uploadedUrl;
      }

      res.status(201).json({
        ...invoice,
        fileUrl: normalizeFileUrl(finalFileUrl),
      });
    } catch (error: any) {
      console.error("Invoice creation error:", error?.message || error);
      res.status(500).json({ error: "Failed to upload invoice" });
    }
  });

  app.get("/api/invoices/next-number/:userId", authMiddleware, async (req, res) => {
    try {
      const invoiceNumber = await storage.getNextInvoiceNumber(req.params.userId);
      res.json({ invoiceNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next invoice number" });
    }
  });

  app.get("/api/invoices/pending-count", authMiddleware, async (req, res) => {
    const user = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(user.id);
    if (!isSupervisor) {
      return res.json({ count: 0 });
    }
    const pendingInvoices = await storage.getPendingInvoices(user.organizationId ?? undefined);
    res.json({ count: pendingInvoices.length });
  });

  app.get("/api/invoices/:id", authMiddleware, async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isOwner = currentUser.id === invoice.userId;

    if (isAdmin) {
      if (currentUser.organizationId !== invoice.organizationId) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    } else if (!isOwner) {
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(invoice.userId)) {
        return res.status(403).json({ error: "Forbidden - Cannot access this invoice" });
      }
    }

    res.json({
      ...invoice,
      fileUrl: normalizeFileUrl(invoice.fileUrl),
    });
  });

  app.delete("/api/invoices/:id", authMiddleware, async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    const user = req.authenticatedUser!;

    if (invoice.status === "approved") {
      return res.status(403).json({ error: "Cannot delete approved invoices" });
    }
    if (invoice.status === "paid") {
      return res.status(403).json({ error: "Cannot delete paid invoices" });
    }
    if (invoice.userId !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this invoice" });
    }

    const success = await storage.deleteInvoice(req.params.id);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete invoice" });
    }
    res.status(204).send();
  });

  app.patch("/api/invoices/:id", authMiddleware, asyncHandler(async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const user = req.authenticatedUser!;

    if (user.organizationId !== invoice.organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { status, reviewNote } = req.body;
    const isSelf = user.id === invoice.userId;
    const isAdmin = user.role === "admin" || user.role === "owner";
    const isApprovalAction = status === "approved" || status === "rejected" || status === "revision_requested";

    if (isSelf && isApprovalAction) {
      return res.status(403).json({ error: "You cannot approve or reject your own invoice" });
    }

    if (isApprovalAction) {
      if (!isAdmin) {
        const directReports = await storage.getUsersBySupervisor(user.id);
        if (!directReports.some((u) => u.id === invoice.userId)) {
          return res.status(403).json({ error: "Insufficient permissions to review this invoice" });
        }
      }
    } else if (status) {
      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if (invoice.status === "approved" && isApprovalAction) {
      return res.status(400).json({ error: "This invoice has already been approved and cannot be changed" });
    }
    if (invoice.status === "paid" && isApprovalAction) {
      return res.status(400).json({ error: "This invoice has been paid and cannot be changed" });
    }

    const { fileUrl, invoiceNumber, amount, currency, invoiceDate, dueDate, description } = req.body;
    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (reviewNote !== undefined) updates.reviewNote = reviewNote;
    if (fileUrl !== undefined) updates.fileUrl = fileUrl;
    if (invoiceNumber !== undefined) updates.invoiceNumber = invoiceNumber;
    if (amount !== undefined) updates.amount = amount;
    if (currency !== undefined) updates.currency = currency;
    if (invoiceDate !== undefined) updates.invoiceDate = invoiceDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (description !== undefined) updates.description = description;
    if (isApprovalAction) {
      updates.reviewedBy = user.id;
      updates.reviewedAt = new Date();
    }

    const updatedInvoice = await storage.updateInvoice(req.params.id, updates);
    if (!updatedInvoice) {
      return res.status(500).json({ error: "Failed to update invoice" });
    }

    if (status === "approved") {
      await notifyInvoiceApproved(updatedInvoice, invoice.userId, user);

      if (invoice.timesheetId) {
        const timesheet = await storage.getTimesheet(invoice.timesheetId);
        if (timesheet && timesheet.status !== "approved") {
          await storage.updateTimesheet(invoice.timesheetId, {
            status: "approved",
            reviewedBy: user.id,
            reviewedAt: new Date(),
          });
          await notifyTimesheetApproved(timesheet, invoice.userId, user);
        }
      }

      await storage.createActivityLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: "Invoice approved",
        details: `Approved invoice ${invoice.invoiceNumber}`,
        entityType: "invoice",
        entityId: invoice.id,
      });
    }

    if (status === "rejected") {
      await notifyInvoiceRejected(updatedInvoice, invoice.userId, user, reviewNote);

      if (invoice.timesheetId) {
        const timesheet = await storage.getTimesheet(invoice.timesheetId);
        if (timesheet && timesheet.status === "submitted") {
          await storage.updateTimesheet(invoice.timesheetId, {
            status: "draft",
            reviewedBy: null,
            reviewedAt: null,
          });

          await storage.createActivityLog({
            userId: user.id,
            organizationId: user.organizationId,
            action: "Timesheet unlocked for revision",
            details: `Timesheet unlocked due to invoice rejection`,
            entityType: "timesheet",
            entityId: invoice.timesheetId,
          });
        }
      }

      await storage.createActivityLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: "Invoice rejected",
        details: `Rejected invoice ${invoice.invoiceNumber}${reviewNote ? `: ${reviewNote}` : ""}`,
        entityType: "invoice",
        entityId: invoice.id,
      });
    }

    if (status === "revision_requested") {
      await notifyInvoiceRevisionRequested(updatedInvoice, invoice.userId, user, reviewNote);

      await storage.createActivityLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: "Invoice revision requested",
        details: `Requested revision for invoice ${invoice.invoiceNumber}${reviewNote ? `: ${reviewNote}` : ""}`,
        entityType: "invoice",
        entityId: invoice.id,
      });
    }

    res.json({
      ...updatedInvoice,
      fileUrl: normalizeFileUrl(updatedInvoice.fileUrl),
    });
  }));

  app.patch("/api/invoices/:id/mark-paid", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (req, res) => {
    const user = req.authenticatedUser!;
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (!checkOrgBoundary(user, invoice)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }
    if (invoice.status !== "approved") {
      return res.status(400).json({ error: "Only approved invoices can be marked as paid" });
    }

    const { paidAt, paymentReference } = req.body || {};
    const paidAtDate = paidAt ? new Date(paidAt) : new Date();
    if (isNaN(paidAtDate.getTime())) {
      return res.status(400).json({ error: "Invalid paidAt date" });
    }

    const updated = await storage.updateInvoice(req.params.id, {
      status: "paid",
      paidAt: paidAtDate,
      paidBy: user.id,
      paymentReference: paymentReference ? String(paymentReference).slice(0, 200) : null,
    });
    if (!updated) {
      return res.status(500).json({ error: "Failed to update invoice" });
    }

    try {
      await storage.createActivityLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: "Invoice marked as paid",
        details: `Marked invoice ${invoice.invoiceNumber} as paid${paymentReference ? ` (ref: ${paymentReference})` : ""}`,
        entityType: "invoice",
        entityId: invoice.id,
      });
    } catch (e) {
      console.error("Failed to log mark-paid activity:", e);
    }

    try {
      await notifyInvoicePaid(updated, invoice.userId, user);
    } catch (notifyErr) {
      console.error("Failed to send invoice paid notification:", notifyErr);
    }

    res.json({
      ...updated,
      fileUrl: normalizeFileUrl(updated.fileUrl),
    });
  }));

  app.get("/api/team/invoices", authMiddleware, async (req, res) => {
    const user = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(user.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const pendingInvoices = await storage.getPendingInvoices(user.organizationId ?? undefined);
    const enrichedInvoices = await Promise.all(
      pendingInvoices.map(async (invoice) => {
        const invoiceUser = await storage.getUser(invoice.userId);
        const timesheet = invoice.timesheetId
          ? await storage.getTimesheet(invoice.timesheetId)
          : null;
        return {
          ...invoice,
          fileUrl: normalizeFileUrl(invoice.fileUrl),
          user: invoiceUser ? {
            id: invoiceUser.id,
            firstName: invoiceUser.firstName,
            lastName: invoiceUser.lastName,
            email: invoiceUser.email,
          } : null,
          timesheet,
        };
      })
    );

    res.json(enrichedInvoices);
  });

  app.get("/api/invoices/:invoiceId/line-items", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const invoice = await storage.getInvoice(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (currentUser.organizationId !== invoice.organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const isSelf = currentUser.id === invoice.userId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isSelf && !isAdmin) {
      const directReports = await storage.getUsersBySupervisor(currentUser.id);
      if (!directReports.some((u) => u.id === invoice.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const lineItems = await storage.getInvoiceLineItems(req.params.invoiceId);
    res.json(lineItems);
  }));

  app.post("/api/invoices/:invoiceId/line-items", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const invoice = await storage.getInvoice(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (currentUser.organizationId !== invoice.organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (currentUser.id !== invoice.userId && currentUser.role !== "admin" && currentUser.role !== "owner") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { description, quantity, rate, total } = req.body;
    const lineItem = await storage.createInvoiceLineItem({
      invoiceId: req.params.invoiceId,
      organizationId: currentUser.organizationId,
      description,
      quantity,
      rate,
      total,
    });
    res.status(201).json(lineItem);
  }));

  // IC payment details
  app.get("/api/ic-payment-details/:userId", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.userId;
    const isSelf = currentUser.id === targetUserId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!isSelf) {
      const targetUser = await storage.getUser(targetUserId);
      if (targetUser && !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    }
    const details = await storage.getIcPaymentDetails(targetUserId);
    res.json(details ?? null);
  });

  app.post("/api/ic-payment-details", authMiddleware, async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const targetUserId = req.body.userId;
      if (currentUser.id !== targetUserId) {
        return res.status(403).json({ error: "Can only manage your own payment details" });
      }
      const {
        bankName, accountHolderFirstName, accountHolderLastName,
        accountNumber, routingNumber, swiftCode, ibanNumber, accountType, address,
      } = req.body;
      const paymentPayload = {
        userId: targetUserId,
        organizationId: currentUser.organizationId,
        bankName, accountHolderFirstName, accountHolderLastName,
        accountNumber, routingNumber, swiftCode, ibanNumber, accountType, address,
      };
      const existing = await storage.getIcPaymentDetails(targetUserId);
      if (existing) {
        const updated = await storage.updateIcPaymentDetails(targetUserId, paymentPayload);
        return res.json(updated);
      }
      const details = await storage.createIcPaymentDetails(paymentPayload);
      res.status(201).json(details);
    } catch (error) {
      res.status(500).json({ error: "Failed to save payment details" });
    }
  });

  app.patch("/api/ic-payment-details/:userId", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (currentUser.id !== req.params.userId) {
      return res.status(403).json({ error: "Can only manage your own payment details" });
    }
    const details = await storage.updateIcPaymentDetails(req.params.userId, req.body);
    if (!details) {
      return res.status(404).json({ error: "Payment details not found" });
    }
    res.json(details);
  });

  // IC responsibilities
  app.get("/api/ic-responsibilities/:icId", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.icId;
    const isSelf = currentUser.id === targetUserId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isSelf && !isAdmin) {
      const directReports = await storage.getUsersBySupervisor(currentUser.id);
      if (!directReports.some((u) => u.id === targetUserId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    if (!isSelf) {
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const responsibilities = await storage.getIcResponsibilities(targetUserId);
    res.json(responsibilities);
  }));

  app.post("/api/ic-responsibilities", authMiddleware, async (req, res) => {
    try {
      const responsibility = await storage.createIcResponsibility(req.body);
      res.status(201).json(responsibility);
    } catch (error) {
      res.status(500).json({ error: "Failed to create responsibility" });
    }
  });

  app.patch("/api/ic-responsibilities/:id", authMiddleware, async (req, res) => {
    const responsibility = await storage.updateIcResponsibility(req.params.id, req.body);
    if (!responsibility) {
      return res.status(404).json({ error: "Responsibility not found" });
    }
    res.json(responsibility);
  });

  app.delete("/api/ic-responsibilities/:id", authMiddleware, async (req, res) => {
    const success = await storage.deleteIcResponsibility(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Responsibility not found" });
    }
    res.status(204).send();
  });

  // Bulk review invoices
  app.post("/api/invoices/bulk-review", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    const parsed = parseBulkBody(req.body);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    const { ids, status, reviewNote } = parsed;

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const teamMemberIds = isAdmin ? null : new Set(await getTeamMemberIds(currentUser.id));

    const summary = await runBulk(ids, async (id) => {
      const invoice = await storage.getInvoice(id);
      if (!invoice) throw new Error("Invoice not found");
      if (currentUser.organizationId && invoice.organizationId && invoice.organizationId !== currentUser.organizationId) {
        throw new Error("Not authorized");
      }
      if (invoice.userId === currentUser.id) {
        throw new Error("You cannot approve or reject your own invoice");
      }
      if (teamMemberIds && !teamMemberIds.has(invoice.userId)) {
        throw new Error("Not authorized to review this invoice");
      }
      if (invoice.status === "approved") {
        throw new Error("Invoice has already been approved");
      }
      if (invoice.status === "paid") {
        throw new Error("Invoice has been paid and cannot be changed");
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(invoicesTable)
          .set({
            status,
            reviewedBy: currentUser.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          })
          .where(eq(invoicesTable.id, id))
          .returning();
        if (!row) throw new Error("Failed to update invoice");
        await tx.insert(activityLogsTable).values({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: status === "approved" ? "Invoice approved" : "Invoice rejected",
          details: `${status === "approved" ? "Approved" : "Rejected"} invoice ${invoice.invoiceNumber}${reviewNote ? `: ${reviewNote}` : ""}`,
          entityType: "invoice",
          entityId: id,
        });
        return row;
      });

      try {
        if (status === "approved") {
          await notifyInvoiceApproved(updated, invoice.userId, currentUser);
          if (invoice.timesheetId) {
            const timesheet = await storage.getTimesheet(invoice.timesheetId);
            if (timesheet && timesheet.status !== "approved") {
              await storage.updateTimesheet(invoice.timesheetId, {
                status: "approved",
                reviewedBy: currentUser.id,
                reviewedAt: new Date(),
              });
              try {
                await notifyTimesheetApproved(timesheet, invoice.userId, currentUser);
              } catch {}
            }
          }
        } else {
          await notifyInvoiceRejected(updated, invoice.userId, currentUser, reviewNote ?? undefined);
          if (invoice.timesheetId) {
            const timesheet = await storage.getTimesheet(invoice.timesheetId);
            if (timesheet && timesheet.status === "submitted") {
              await storage.updateTimesheet(invoice.timesheetId, {
                status: "draft",
                reviewedBy: null,
                reviewedAt: null,
              });
              try {
                await storage.createActivityLog({
                  userId: currentUser.id,
                  organizationId: currentUser.organizationId,
                  action: "Timesheet unlocked for revision",
                  details: `Timesheet unlocked due to invoice rejection`,
                  entityType: "timesheet",
                  entityId: invoice.timesheetId,
                });
              } catch {}
            }
          }
        }
      } catch (e) {
        console.error("Notification or side-effect failed:", e);
      }
    });

    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `Bulk invoice ${status}`,
        details: `Bulk action by ${currentUser.firstName} ${currentUser.lastName}: ${status} ${summary.successCount} of ${ids.length} invoices (${summary.failureCount} failed)`,
        entityType: "invoice",
      });
    } catch {}

    res.json(summary);
  }));
}
