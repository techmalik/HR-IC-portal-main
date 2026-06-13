import type { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, requireRole } from "./shared";

export function registerNotificationRoutes(app: Express): void {
  // ── Notifications ─────────────────────────────────────────────────────────

  app.get("/api/notifications", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, status } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });

    if (status === "unread") {
      res.json(await storage.getUnreadNotificationsByUser(userId as string));
    } else {
      res.json(await storage.getNotificationsByUser(userId as string));
    }
  });

  app.get("/api/notifications/count/:userId", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.params;
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  });

  app.get("/api/notifications/count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });
    res.json({ count: await storage.getUnreadNotificationCount(userId as string) });
  });

  app.get("/api/notifications/:userId", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.params;
    if (userId === "count" || userId === "read-all") {
      return res.status(404).json({ error: "Not found" });
    }
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });
    res.json(await storage.getNotificationsByUser(userId));
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const notification = await storage.getNotification(req.params.id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });
    res.json(await storage.markNotificationAsRead(req.params.id));
  });

  app.post("/api/notifications/read-all", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  });

  // ── Notification preferences ───────────────────────────────────────────────

  const DEFAULT_PREFS = {
    inAppEnabled: true,
    emailEnabled: false,
    oooNotifications: true,
    timesheetNotifications: true,
    overtimeNotifications: true,
    invoiceNotifications: true,
    deadlineReminders: true,
    evaluationNotifications: true,
  };

  app.get("/api/notification-preferences", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });

    let prefs = await storage.getNotificationPreferences(userId as string);
    if (!prefs) {
      prefs = await storage.createNotificationPreferences({ userId: userId as string, ...DEFAULT_PREFS });
    }
    res.json(prefs);
  });

  app.patch("/api/notification-preferences", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, ...updates } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (userId !== currentUser.id) return res.status(403).json({ error: "Forbidden" });

    let prefs = await storage.getNotificationPreferences(userId);
    if (!prefs) {
      prefs = await storage.createNotificationPreferences({ userId, ...DEFAULT_PREFS, ...updates });
    } else {
      prefs = await storage.updateNotificationPreferences(userId, updates);
    }
    res.json(prefs);
  });

  // ── Activity logs (admin only) ─────────────────────────────────────────────

  app.get("/api/activity-logs", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    res.json(await storage.getActivityLogs(req.authenticatedUser!.organizationId ?? undefined));
  });

  // ── Organization ───────────────────────────────────────────────────────────

  app.get("/api/organization", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(404).json({ error: "No organization associated with this user" });
    }
    const org = await storage.getOrganization(currentUser.organizationId);
    if (!org) return res.status(404).json({ error: "Organization not found" });
    res.json(org);
  });

  app.patch("/api/organization", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(404).json({ error: "No organization associated with this user" });
    }
    const updated = await storage.updateOrganization(currentUser.organizationId, req.body);
    if (!updated) return res.status(404).json({ error: "Organization not found" });
    res.json(updated);
  });
}
