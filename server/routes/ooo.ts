import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  oooRequests as oooRequestsTable,
  activityLogs as activityLogsTable,
} from "@shared/schema";
import { createOOORequestBodySchema } from "@shared/schema";
import { validateBody } from "../middleware/validate";
import { parseBulkBody, runBulk } from "../bulkReview";
import {
  authMiddleware,
  asyncHandler,
  hasSupervisorPrivileges,
} from "./shared";
import {
  notifyOOOSubmitted,
  notifyOOOApproved,
  notifyOOORejected,
} from "../notificationService";

export function registerOooRoutes(app: Express): void {
  // OOO Request routes - protected
  app.get("/api/ooo-requests", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.query;

    // Users can only see their own requests unless admin or dynamic supervisor
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);

    if (userId) {
      if (!isSupervisor && userId !== currentUser.id) {
        return res.status(403).json({ error: "Cannot view other users' requests" });
      }
      const requests = await storage.getOOORequestsByUser(userId as string);
      res.json(requests);
    } else {
      if (!isSupervisor) {
        const requests = await storage.getOOORequestsByUser(currentUser.id);
        return res.json(requests);
      }
      const requests = await storage.getAllOOORequests(req.authenticatedUser!.organizationId ?? undefined);
      res.json(requests);
    }
  });

  app.get("/api/leave-requests", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    const requests = await storage.getAllOOORequests(req.authenticatedUser!.organizationId ?? undefined);

    // Enrich with user information
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const user = await storage.getUser(r.userId);
        return {
          ...r,
          userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          userEmail: user?.email || "",
        };
      })
    );

    res.json(enrichedRequests);
  });

  app.get("/api/leave-requests/pending", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { managerId } = req.query;

    let requests = await storage.getPendingOOORequests(req.authenticatedUser!.organizationId ?? undefined);

    // Filter based on role - admins see all, IC supervisors see their team only
    if (currentUser.role === "admin" || currentUser.role === "owner") {
      // Admins/owners see all pending requests
    } else if (managerId) {
      // Filter to only show requests for this manager
      requests = requests.filter(r => r.managerId === managerId);
    } else {
      return res.status(400).json({ error: "managerId is required" });
    }

    // Enrich with user information
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const user = await storage.getUser(r.userId);
        return {
          ...r,
          userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          userEmail: user?.email || "",
        };
      })
    );

    res.json(enrichedRequests);
  });

  // Count endpoints for sidebar badges
  app.get("/api/leave-requests/pending-count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;

    let requests = await storage.getPendingOOORequests(req.authenticatedUser!.organizationId ?? undefined);

    // Filter based on user role - only admins see all, IC supervisors see their team
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (isSupervisor && currentUser.role !== "admin") {
      requests = requests.filter(r => r.managerId === currentUser.id);
    }

    res.json({ count: requests.length });
  });

  app.post("/api/ooo-requests", authMiddleware, validateBody(createOOORequestBodySchema), async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const { startDate, endDate, reason, oooType, managerId } = req.body;

      // Whitelist fields; force status to "pending" regardless of what the client sends
      const request = await storage.createOOORequest({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        startDate,
        endDate,
        reason,
        oooType,
        managerId,
        status: "pending",
      });
      const submitter = await storage.getUser(currentUser.id);

      try {
        await storage.createActivityLog({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: "OOO request created",
          details: `Requested time off from ${startDate} to ${endDate}`,
          entityType: "ooo_request",
          entityId: request.id,
        });

        if (submitter) {
          await notifyOOOSubmitted(request, submitter);
        }
      } catch (e) {
        console.error("Failed to create activity log or notification:", e);
      }

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create OOO request" });
    }
  });

  app.patch("/api/ooo-requests/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingRequest = await storage.getOOORequest(req.params.id);
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
      if (isSelf) {
        return res.status(403).json({ error: "You cannot approve or reject your own request" });
      }
      if (!isAdmin) {
        const directReports = await storage.getUsersBySupervisor(currentUser.id);
        if (!directReports.some((u) => u.id === existingRequest.userId)) {
          return res.status(403).json({ error: "Forbidden - not a supervisor of this user" });
        }
      }
    } else {
      // Non-approval edits (e.g. withdrawing a request) — owner only
      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "You can only edit your own OOO request" });
      }
    }

    // Whitelist fields; derive server-controlled reviewer identity
    const { status, reviewNote, startDate, endDate, reason, type } = req.body;
    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (reviewNote !== undefined) updatePayload.reviewNote = reviewNote;
    if (startDate) updatePayload.startDate = startDate;
    if (endDate) updatePayload.endDate = endDate;
    if (reason !== undefined) updatePayload.reason = reason;
    if (type) updatePayload.type = type;
    if (isApprovalAction) {
      updatePayload.reviewedBy = currentUser.id;
      updatePayload.reviewedAt = new Date();
    }

    const request = await storage.updateOOORequest(req.params.id, updatePayload);

    if (!request) {
      return res.status(500).json({ error: "Failed to update request" });
    }

    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `OOO request ${status || "updated"}`,
        details: `Leave request was ${status || "updated"}`,
        entityType: "ooo_request",
        entityId: request.id,
      });

      if (isApprovalAction) {
        if (status === "approved") {
          await notifyOOOApproved(request, currentUser as any);
        } else if (status === "rejected") {
          await notifyOOORejected(request, currentUser as any, reviewNote);
        }
      }
    } catch (e) {
      console.error("Failed to create activity log or notification:", e);
    }

    res.json(request);
  }));

  // Get approved OOO dates for a user within a month
  app.get("/api/ooo-requests/approved-dates", authMiddleware, async (req, res) => {
    const { userId, month, year } = req.query;
    if (!userId || !month || !year) {
      return res.status(400).json({ error: "userId, month, and year are required" });
    }

    const requests = await storage.getOOORequestsByUser(userId as string);
    const approvedRequests = requests.filter(r => r.status === "approved");

    const monthInt = parseInt(month as string);
    const yearInt = parseInt(year as string);

    const datesInMonth: { date: string; oooType: string }[] = [];

    approvedRequests.forEach(request => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() + 1 === monthInt && d.getFullYear() === yearInt) {
          datesInMonth.push({
            date: d.toISOString().split('T')[0],
            oooType: request.oooType,
          });
        }
      }
    });

    res.json(datesInMonth);
  });

  app.post("/api/ooo-requests/bulk-review", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    const parsed = parseBulkBody(req.body);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    const { ids, status, reviewNote } = parsed;

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    const summary = await runBulk(ids, async (id) => {
      const existing = await storage.getOOORequest(id);
      if (!existing) throw new Error("Request not found");
      if (currentUser.organizationId && existing.organizationId && existing.organizationId !== currentUser.organizationId) {
        throw new Error("Not authorized");
      }
      if (existing.userId === currentUser.id) {
        throw new Error("You cannot approve or reject your own request");
      }
      if (!isAdmin && existing.managerId !== currentUser.id) {
        throw new Error("Not authorized to review this request");
      }
      if (existing.status !== "pending") {
        throw new Error(`Request has already been ${existing.status}`);
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(oooRequestsTable)
          .set({
            status,
            reviewedBy: currentUser.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          })
          .where(eq(oooRequestsTable.id, id))
          .returning();
        if (!row) throw new Error("Failed to update request");
        await tx.insert(activityLogsTable).values({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: `OOO request ${status}`,
          details: `Leave request was ${status}${reviewNote ? `: ${reviewNote}` : ""}`,
          entityType: "ooo_request",
          entityId: id,
        });
        return row;
      });

      try {
        if (status === "approved") {
          await notifyOOOApproved(updated, currentUser);
        } else {
          await notifyOOORejected(updated, currentUser, reviewNote ?? undefined);
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
        action: `Bulk OOO ${status}`,
        details: `Bulk action by ${currentUser.firstName} ${currentUser.lastName}: ${status} ${summary.successCount} of ${ids.length} leave requests (${summary.failureCount} failed)`,
        entityType: "ooo_request",
        // entityId omitted: bulk summary spans multiple records
      });
    } catch {}

    res.json(summary);
  }));
}
