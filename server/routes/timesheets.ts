import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { timesheets as timesheetsTable, activityLogs as activityLogsTable } from "@shared/schema";
import { authMiddleware, requireRole, asyncHandler, hasSupervisorPrivileges, checkOrgBoundary, getTeamMemberIds } from "./shared";
import { isWeekend } from "./helpers";
import { parseBulkBody, runBulk } from "../bulkReview";
import {
  notifyTimesheetSubmitted,
  notifyTimesheetApproved,
  notifyTimesheetRejected,
  notifyTimesheetUnlocked,
} from "../notificationService";

export function registerTimesheetRoutes(app: Express): void {
  // Timesheet routes
  app.get("/api/timesheets", authMiddleware, async (req, res) => {
    const { userId, month, year } = req.query;
    
    if (userId && month && year) {
      const timesheet = await storage.getTimesheetByUserAndMonth(
        userId as string,
        parseInt(month as string),
        parseInt(year as string)
      );
      res.json(timesheet || null);
    } else if (userId) {
      const timesheets = await storage.getTimesheetsByUser(userId as string);
      res.json(timesheets);
    } else {
      const timesheets = await storage.getAllTimesheets(req.authenticatedUser!.organizationId ?? undefined);
      // Enrich with user information
      const enrichedTimesheets = await Promise.all(
        timesheets.map(async (t) => {
          const user = await storage.getUser(t.userId);
          return {
            ...t,
            userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            userEmail: user?.email || "",
          };
        })
      );
      res.json(enrichedTimesheets);
    }
  });

  app.get("/api/team/timesheets", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    const statusFilter = req.query.status as string | undefined;
    
    let timesheets = statusFilter
      ? (await storage.getAllTimesheets(currentUser.organizationId ?? undefined)).filter(t => t.status === statusFilter)
      : await storage.getSubmittedTimesheets(currentUser.organizationId ?? undefined);
    
    // Filter based on role - IC supervisors only see their team's timesheets, admins see all
    if (currentUser.role !== "admin") {
      const teamMembers = await storage.getUsersBySupervisor(currentUser.id);
      const teamMemberIds = teamMembers.map(m => m.id);
      timesheets = timesheets.filter(t => teamMemberIds.includes(t.userId));
    }
    
    // Enrich with user information
    const enrichedTimesheets = await Promise.all(
      timesheets.map(async (t) => {
        const user = await storage.getUser(t.userId);
        return {
          ...t,
          userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          userEmail: user?.email || "",
        };
      })
    );
    
    res.json(enrichedTimesheets);
  });

  app.get("/api/timesheets/pending-count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    let timesheets = await storage.getSubmittedTimesheets(currentUser.organizationId ?? undefined);
    
    // Filter based on role - IC supervisors only see their team's timesheets, admins see all
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (isSupervisor && currentUser.role !== "admin") {
      const teamMembers = await storage.getUsersBySupervisor(currentUser.id);
      const teamMemberIds = teamMembers.map(m => m.id);
      timesheets = timesheets.filter(t => teamMemberIds.includes(t.userId));
    }
    
    res.json({ count: timesheets.length });
  });

  app.get("/api/timesheets/:id/entries", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const timesheet = await storage.getTimesheet(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }
    const isSelf = currentUser.id === timesheet.userId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isSamOrg = currentUser.organizationId && currentUser.organizationId === timesheet.organizationId;
    if (!isSamOrg) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!isSelf && !isAdmin) {
      const directReports = await storage.getUsersBySupervisor(currentUser.id);
      if (!directReports.some((u) => u.id === timesheet.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const entries = await storage.getDailyEntriesByTimesheet(req.params.id);
    res.json(entries);
  }));

  app.post("/api/timesheets/save", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, month, year, entries } = req.body;

    if (!userId || month === undefined || year === undefined || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Required fields missing: userId, month, year, entries" });
    }

    // Supervisors may not edit another user's timesheet — only approve/reject.
    // Admins/owners can edit on behalf of users in their org.
    const isSelf = currentUser.id === userId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "You can only save your own timesheet" });
    }
    if (isAdmin && !isSelf) {
      const targetUser = await storage.getUser(userId);
      if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    }

    let timesheet = await storage.getTimesheetByUserAndMonth(userId, month, year);

    // Prevent editing approved timesheets
    if (timesheet && timesheet.status === "approved") {
      return res.status(403).json({ error: "Cannot edit an approved timesheet" });
    }

    // Prevent editing submitted timesheets (they're locked until invoice is reviewed)
    if (timesheet && timesheet.status === "submitted") {
      return res.status(403).json({ error: "Cannot edit a submitted timesheet. It will be unlocked if the invoice is rejected." });
    }
    
    const orgId = req.authenticatedUser!.organizationId;
    const totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

    if (timesheet) {
      const updated = await storage.updateTimesheet(timesheet.id, {
        totalHours,
        status: "draft",
      });
      if (!updated) {
        return res.status(500).json({ error: "Failed to update timesheet" });
      }
      timesheet = updated;
    } else {
      timesheet = await storage.createTimesheet({
        userId,
        month,
        year,
        totalHours,
        status: "draft",
        organizationId: orgId,
      });
    }

    // Atomically replace entries so a crash mid-write can't leave the timesheet empty.
    const entryPayloads = entries.map((e: any) => ({
      timesheetId: timesheet!.id,
      date: e.date,
      hours: e.hours,
      activityLog: e.activityLog,
      organizationId: orgId,
    }));
    await storage.replaceTimesheetEntries(timesheet.id, entryPayloads);

    // Overtime requests are best-effort and can be retried; handled outside the transaction.
    const STANDARD_HOURS = 8;
    for (const entry of entries) {
      const isWeekendEntry = isWeekend(entry.date);
      const isOvertime = entry.hours > STANDARD_HOURS;
      if ((isOvertime || isWeekendEntry) && entry.hours > 0) {
        const existingOT = await storage.getOvertimeRequestByTimesheetAndDate(timesheet.id, entry.date);
        if (!existingOT) {
          await storage.createOvertimeRequest({
            userId,
            timesheetId: timesheet.id,
            date: entry.date,
            requestedHours: entry.hours,
            status: "pending",
            isWeekendWork: isWeekendEntry,
            organizationId: orgId,
          });
        } else if (existingOT.isWeekendWork !== isWeekendEntry) {
          await storage.updateOvertimeRequest(existingOT.id, { isWeekendWork: isWeekendEntry });
        }
      }
    }

    res.json(timesheet);
  }));

  app.post("/api/timesheets/submit", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, month, year, entries } = req.body;

    if (!userId || month === undefined || year === undefined || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Required fields missing: userId, month, year, entries" });
    }

    // Only the owning IC (or an admin acting on their behalf in the same org) may submit.
    const isSelf = currentUser.id === userId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "You can only submit your own timesheet" });
    }
    if (isAdmin && !isSelf) {
      const targetUser = await storage.getUser(userId);
      if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    }

    let timesheet = await storage.getTimesheetByUserAndMonth(userId, month, year);
    
    const orgId = req.authenticatedUser!.organizationId;
    const totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

    if (timesheet) {
      const updated = await storage.updateTimesheet(timesheet.id, {
        totalHours,
        status: "submitted",
        submittedAt: new Date(),
      });
      if (!updated) {
        return res.status(500).json({ error: "Failed to update timesheet" });
      }
      timesheet = updated;
    } else {
      const created = await storage.createTimesheet({
        userId,
        month,
        year,
        totalHours,
        status: "submitted",
        organizationId: orgId,
      });
      const updated = await storage.updateTimesheet(created.id, { submittedAt: new Date() });
      if (!updated) {
        return res.status(500).json({ error: "Failed to update timesheet" });
      }
      timesheet = updated;
    }

    // Atomically replace entries so a crash mid-write can't leave the timesheet empty.
    const entryPayloads = entries.map((e: any) => ({
      timesheetId: timesheet!.id,
      date: e.date,
      hours: e.hours,
      activityLog: e.activityLog,
      organizationId: orgId,
    }));
    await storage.replaceTimesheetEntries(timesheet.id, entryPayloads);

    // Overtime requests are best-effort; handled outside the transaction.
    const STANDARD_HOURS = 8;
    for (const entry of entries) {
      const isWeekendEntry = isWeekend(entry.date);
      const isOvertime = entry.hours > STANDARD_HOURS;
      if ((isOvertime || isWeekendEntry) && entry.hours > 0) {
        const existingOT = await storage.getOvertimeRequestByTimesheetAndDate(timesheet.id, entry.date);
        if (!existingOT) {
          await storage.createOvertimeRequest({
            userId,
            timesheetId: timesheet.id,
            date: entry.date,
            requestedHours: entry.hours,
            status: "pending",
            isWeekendWork: isWeekendEntry,
            organizationId: orgId,
          });
        } else if (existingOT.isWeekendWork !== isWeekendEntry) {
          await storage.updateOvertimeRequest(existingOT.id, { isWeekendWork: isWeekendEntry });
        }
      }
    }

    await storage.createActivityLog({
      userId,
      organizationId: orgId,
      action: "Timesheet submitted",
      details: `Submitted timesheet for ${month}/${year} with ${totalHours} hours`,
      entityType: "timesheet",
      entityId: timesheet.id,
    });

    const submitter = await storage.getUser(userId);
    if (submitter) {
      await notifyTimesheetSubmitted(timesheet, submitter);
    }

    res.json(timesheet);
  }));

  app.patch("/api/timesheets/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingTimesheet = await storage.getTimesheet(req.params.id);

    if (!existingTimesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }

    // Org boundary: only users in the same org may touch this timesheet
    if (currentUser.organizationId !== existingTimesheet.organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const isSelf = currentUser.id === existingTimesheet.userId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isApprovalAction = req.body.status === "approved" || req.body.status === "rejected" || req.body.status === "sent_back";

    if (isApprovalAction) {
      // Supervisors and admins may approve/reject, but not on their own timesheet.
      if (isSelf) {
        return res.status(403).json({ error: "You cannot approve or reject your own timesheet" });
      }
      if (!isAdmin) {
        const directReports = await storage.getUsersBySupervisor(currentUser.id);
        if (!directReports.some((u) => u.id === existingTimesheet.userId)) {
          return res.status(403).json({ error: "Forbidden - not a supervisor of this user" });
        }
      }
    } else {
      // Non-approval edits (status changes like "draft", field corrections) — owner only
      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "You can only edit your own timesheet" });
      }
    }

    // Whitelist the fields callers are allowed to set; derive server-controlled fields.
    const { status, reviewNote } = req.body;
    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (reviewNote !== undefined) updatePayload.reviewNote = reviewNote;
    if (isApprovalAction) {
      updatePayload.reviewedBy = currentUser.id;
      updatePayload.reviewedAt = new Date();
    }

    const timesheet = await storage.updateTimesheet(req.params.id, updatePayload);

    if (!timesheet) {
      return res.status(500).json({ error: "Failed to update timesheet" });
    }

    if (isApprovalAction) {
      const reviewer = await storage.getUser(currentUser.id);
      if (reviewer) {
        if (status === "approved") {
          await notifyTimesheetApproved(timesheet, existingTimesheet.userId, reviewer);
        } else if (status === "rejected") {
          await notifyTimesheetRejected(timesheet, existingTimesheet.userId, reviewer, reviewNote);
        }
      }
    }

    res.json(timesheet);
  }));

  // Unlock approved timesheet for revision (supervisor only)
  app.post("/api/timesheets/:id/unlock", authMiddleware, async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const { note } = req.body;

      if (!note || !note.trim()) {
        return res.status(400).json({ error: "A reason for unlocking is required" });
      }

      const timesheet = await storage.getTimesheet(req.params.id);
      if (!timesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }

      if (timesheet.status !== "approved") {
        return res.status(400).json({ error: "Only approved timesheets can be unlocked" });
      }

      // Org boundary
      if (currentUser.organizationId !== timesheet.organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Must be an admin/owner or the timesheet owner's direct supervisor
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (!isAdmin) {
        const directReports = await storage.getUsersBySupervisor(currentUser.id);
        if (!directReports.some((u) => u.id === timesheet.userId)) {
          return res.status(403).json({ error: "Only the timesheet owner's supervisor can unlock it" });
        }
      }

      // Update timesheet to draft status and add unlock note
      const updatedTimesheet = await storage.updateTimesheet(req.params.id, {
        status: "draft",
        reviewNote: `Unlocked for revision by ${currentUser.firstName} ${currentUser.lastName}: ${note}`,
        reviewedAt: new Date(),
        reviewedBy: currentUser.id,
      });

      // Log the activity
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: "Timesheet unlocked for revision",
        details: `Unlocked timesheet for ${timesheet.month}/${timesheet.year} for user ${timesheet.userId}. Reason: ${note}`,
        entityType: "timesheet",
        entityId: timesheet.id,
      });

      // Also unlock any associated invoice by setting it back to pending_review
      const invoices = await storage.getInvoicesByUser(timesheet.userId);
      const linkedInvoice = invoices.find(
        (inv) => inv.month === timesheet.month && inv.year === timesheet.year
      );
      if (linkedInvoice) {
        await storage.updateInvoice(linkedInvoice.id, {
          status: "pending_review",
        });
        await storage.createActivityLog({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: "Invoice returned for revision",
          details: `Invoice ${linkedInvoice.fileName} returned for revision due to timesheet unlock`,
          entityType: "invoice",
          entityId: linkedInvoice.id,
        });
      }

      // Notify the IC user
      try {
        await notifyTimesheetUnlocked(timesheet, timesheet.userId, currentUser, note);
      } catch (notifyErr) {
        console.error("Failed to send timesheet unlock notification:", notifyErr);
      }

      res.json(updatedTimesheet);
    } catch (error: any) {
      console.error("Unlock timesheet error:", error?.message || error);
      res.status(500).json({ error: "Failed to unlock timesheet" });
    }
  });

  app.get("/api/timesheets-report", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    const timesheets = await storage.getAllTimesheets(currentUser.organizationId ?? undefined);
    const enrichedTimesheets = await Promise.all(
      timesheets.map(async (t) => {
        const user = await storage.getUser(t.userId);
        return {
          ...t,
          userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          userEmail: user?.email || "",
        };
      })
    );
    res.json(enrichedTimesheets);
  });

  // Bulk: timesheets
  app.post("/api/timesheets/bulk-review", authMiddleware, asyncHandler(async (req, res) => {
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
      const existing = await storage.getTimesheet(id);
      if (!existing) throw new Error("Timesheet not found");
      if (currentUser.organizationId && existing.organizationId && existing.organizationId !== currentUser.organizationId) {
        throw new Error("Not authorized");
      }
      if (existing.userId === currentUser.id) {
        throw new Error("You cannot approve or reject your own timesheet");
      }
      if (teamMemberIds && !teamMemberIds.has(existing.userId)) {
        throw new Error("Not authorized to review this timesheet");
      }
      if (existing.status !== "submitted") {
        throw new Error(`Timesheet is ${existing.status}, not submitted`);
      }

      // Per-item atomic write: status update + activity log committed together.
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(timesheetsTable)
          .set({
            status,
            reviewedBy: currentUser.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          })
          .where(eq(timesheetsTable.id, id))
          .returning();
        if (!row) throw new Error("Failed to update timesheet");
        await tx.insert(activityLogsTable).values({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: `Timesheet ${status}`,
          details: `Timesheet for ${existing.month}/${existing.year} was ${status}${reviewNote ? `: ${reviewNote}` : ""}`,
          entityType: "timesheet",
          entityId: id,
        });
        return row;
      });

      // Post-commit side-effects (best-effort).
      try {
        if (status === "approved") {
          await notifyTimesheetApproved(updated, existing.userId, currentUser);
        } else {
          await notifyTimesheetRejected(updated, existing.userId, currentUser, reviewNote ?? undefined);
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
        action: `Bulk timesheet ${status}`,
        details: `Bulk action by ${currentUser.firstName} ${currentUser.lastName}: ${status} ${summary.successCount} of ${ids.length} timesheets (${summary.failureCount} failed)`,
        entityType: "timesheet",
        // entityId omitted: bulk summary spans multiple records
      });
    } catch {}

    res.json(summary);
  }));

}
