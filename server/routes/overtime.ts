import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  overtimeRequests as overtimeRequestsTable,
  activityLogs as activityLogsTable,
} from "@shared/schema";
import { parseBulkBody, runBulk } from "../bulkReview";
import {
  authMiddleware,
  asyncHandler,
  hasSupervisorPrivileges,
  getTeamMemberIds,
} from "./shared";
import {
  notifyOvertimeSubmitted,
  notifyOvertimeApproved,
  notifyOvertimeRejected,
} from "../notificationService";

export function registerOvertimeRoutes(app: Express): void {
  // Overtime request routes - protected
  app.get("/api/overtime-requests", authMiddleware, async (req, res) => {
    const { userId, timesheetId, status } = req.query;

    let requests: Awaited<ReturnType<typeof storage.getAllOvertimeRequests>> = [];

    if (userId) {
      requests = await storage.getOvertimeRequestsByUser(userId as string);
    } else if (timesheetId) {
      requests = await storage.getOvertimeRequestsByTimesheet(timesheetId as string);
    } else if (status === "pending") {
      requests = await storage.getPendingOvertimeRequests(req.authenticatedUser!.organizationId ?? undefined);
    } else {
      requests = await storage.getAllOvertimeRequests(req.authenticatedUser!.organizationId ?? undefined);
    }

    // Enrich overtime requests with activity log from daily entries
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const dailyEntry = await storage.getDailyEntryByTimesheetAndDate(r.timesheetId, r.date);
        return {
          ...r,
          activityLog: dailyEntry?.activityLog || null,
        };
      })
    );
    res.json(enrichedRequests);
  });

  app.get("/api/overtime-requests/pending-count", authMiddleware, async (req, res) => {
    const requests = await storage.getPendingOvertimeRequests(req.authenticatedUser!.organizationId ?? undefined);
    res.json({ count: requests.length });
  });

  app.post("/api/overtime-requests", authMiddleware, async (req, res) => {
    try {
      // Check for existing overtime request to prevent duplicates
      const existingRequest = await storage.getOvertimeRequestByTimesheetAndDate(
        req.body.timesheetId,
        req.body.date
      );

      if (existingRequest) {
        // Return existing request instead of creating a duplicate
        return res.json(existingRequest);
      }

      const { userId, timesheetId, date, requestedHours, isWeekendWork } = req.body;
      const request = await storage.createOvertimeRequest({
        userId,
        timesheetId,
        date,
        requestedHours,
        isWeekendWork: isWeekendWork ?? false,
        organizationId: req.authenticatedUser!.organizationId,
      });
      const submitter = await storage.getUser(userId);

      try {
        await storage.createActivityLog({
          userId: req.body.userId,
          organizationId: req.authenticatedUser!.organizationId,
          action: "Overtime request created",
          details: `Requested ${req.body.requestedHours - 8} overtime hours for ${req.body.date}`,
          entityType: "overtime_request",
          entityId: request.id,
        });

        if (submitter) {
          await notifyOvertimeSubmitted(request, submitter);
        }
      } catch (e) {
        console.error("Failed to create activity log or notification:", e);
      }

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create overtime request" });
    }
  });

  app.patch("/api/overtime-requests/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingRequest = await storage.getOvertimeRequest(req.params.id);

    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Org boundary
    if (currentUser.organizationId !== existingRequest.organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const isSelf = currentUser.id === existingRequest.userId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isApprovalAction = req.body.status === "approved" || req.body.status === "rejected";

    if (isApprovalAction) {
      // Self-approval must be rejected based on server-resolved identity, not client-supplied reviewedBy
      if (isSelf) {
        return res.status(403).json({ error: "You cannot approve or reject your own overtime request" });
      }
      if (!isAdmin) {
        const directReports = await storage.getUsersBySupervisor(currentUser.id);
        if (!directReports.some((u) => u.id === existingRequest.userId)) {
          return res.status(403).json({ error: "Forbidden - not a supervisor of this user" });
        }
      }
    } else {
      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "You can only edit your own overtime request" });
      }
    }

    const { status, reviewNote, approvedHours } = req.body;

    // Validate approvedHours if provided
    if (status === "approved" && approvedHours !== undefined) {
      const parsed = Number(approvedHours);
      if (isNaN(parsed) || parsed < 1 || parsed > existingRequest.requestedHours) {
        return res.status(400).json({
          error: `Approved hours must be between 1 and ${existingRequest.requestedHours}`,
        });
      }
    }

    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (reviewNote !== undefined) updatePayload.reviewNote = reviewNote;
    if (approvedHours !== undefined) updatePayload.approvedHours = approvedHours;
    if (isApprovalAction) {
      updatePayload.reviewedBy = currentUser.id;
      updatePayload.reviewedAt = new Date();
    }

    const request = await storage.updateOvertimeRequest(req.params.id, updatePayload);

    if (!request) {
      return res.status(500).json({ error: "Failed to update overtime request" });
    }

    // If overtime is rejected, reset the daily entry hours to 8 (max normal hours)
    // and recalculate the timesheet total from all entries for accuracy
    if (status === "rejected") {
      try {
        const dailyEntry = await storage.getDailyEntryByTimesheetAndDate(
          existingRequest.timesheetId,
          existingRequest.date
        );
        if (dailyEntry && dailyEntry.hours > 8) {
          await storage.updateDailyEntry(dailyEntry.id, { hours: 8 });
          const allEntries = await storage.getDailyEntriesByTimesheet(existingRequest.timesheetId);
          const newTotal = allEntries.reduce((sum, entry) => {
            return sum + (entry.id === dailyEntry.id ? 8 : entry.hours);
          }, 0);
          await storage.updateTimesheet(existingRequest.timesheetId, { totalHours: newTotal });
        }
      } catch (e) {
        console.error("Failed to reset daily entry hours after overtime rejection:", e);
      }
    }

    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `Overtime request ${status || "updated"}`,
        details: `Overtime request was ${status || "updated"}`,
        entityType: "overtime_request",
        entityId: request.id,
      });

      if (isApprovalAction) {
        if (status === "approved") {
          await notifyOvertimeApproved(request, currentUser as any);
        } else if (status === "rejected") {
          await notifyOvertimeRejected(request, currentUser as any, reviewNote);
        }
      }
    } catch (e) {
      console.error("Failed to create activity log or notification:", e);
    }

    res.json(request);
  }));

  // Bulk: overtime
  app.post("/api/overtime-requests/bulk-review", authMiddleware, asyncHandler(async (req, res) => {
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
      const existing = await storage.getOvertimeRequest(id);
      if (!existing) throw new Error("Request not found");
      if (currentUser.organizationId && existing.organizationId && existing.organizationId !== currentUser.organizationId) {
        throw new Error("Not authorized");
      }
      if (existing.userId === currentUser.id) {
        throw new Error("You cannot approve or reject your own overtime request");
      }
      if (teamMemberIds && !teamMemberIds.has(existing.userId)) {
        throw new Error("Not authorized to review this request");
      }
      if (existing.status !== "pending") {
        throw new Error(`Request has already been ${existing.status}`);
      }

      const updates: Record<string, any> = {
        status,
        reviewedBy: currentUser.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
      };
      if (status === "approved") {
        updates.approvedHours = existing.requestedHours;
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(overtimeRequestsTable)
          .set(updates)
          .where(eq(overtimeRequestsTable.id, id))
          .returning();
        if (!row) throw new Error("Failed to update request");
        await tx.insert(activityLogsTable).values({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: `Overtime request ${status}`,
          details: `Overtime request was ${status}${reviewNote ? `: ${reviewNote}` : ""}`,
          entityType: "overtime_request",
          entityId: id,
        });
        return row;
      });

      // On rejection, reset over-8h daily entry hours back to 8 like the single-item route.
      if (status === "rejected") {
        try {
          const dailyEntry = await storage.getDailyEntryByTimesheetAndDate(existing.timesheetId, existing.date);
          if (dailyEntry && dailyEntry.hours > 8) {
            await storage.updateDailyEntry(dailyEntry.id, { hours: 8 });
            const allEntries = await storage.getDailyEntriesByTimesheet(existing.timesheetId);
            const newTotal = allEntries.reduce((sum, e) => sum + (e.id === dailyEntry.id ? 8 : e.hours), 0);
            await storage.updateTimesheet(existing.timesheetId, { totalHours: newTotal });
          }
        } catch (e) {
          console.error("Failed to reset hours after overtime rejection:", e);
        }
      }

      try {
        if (status === "approved") {
          await notifyOvertimeApproved(updated, currentUser);
        } else {
          await notifyOvertimeRejected(updated, currentUser, reviewNote ?? undefined);
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
        action: `Bulk overtime ${status}`,
        details: `Bulk action by ${currentUser.firstName} ${currentUser.lastName}: ${status} ${summary.successCount} of ${ids.length} overtime requests (${summary.failureCount} failed)`,
        entityType: "overtime_request",
        // entityId omitted: bulk summary spans multiple records
      });
    } catch {}

    res.json(summary);
  }));
}
