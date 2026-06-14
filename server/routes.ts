import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, comparePassword } from "./storage";
import { normalizeCurrencyInput } from "./routes/helpers";
import type { User } from "@shared/schema";

import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { createMigrateFilesRouter } from "./migrate-files";
import { registerAuthRoutes } from "./routes/auth";
import { registerBillingRoutes } from "./routes/billing";
import { registerContractRoutes } from "./routes/contracts";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerOooRoutes } from "./routes/ooo";
import { registerOvertimeRoutes } from "./routes/overtime";
import { registerExpensesRoutes } from "./routes/expenses";
import { registerTimesheetRoutes } from "./routes/timesheets";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerEvaluationRoutes } from "./routes/evaluations";
import {
  getCurrentUser,
  authMiddleware,
  requireRole,
  requirePlatformAdmin,
  asyncHandler,
  hasSupervisorPrivileges,
  checkOrgBoundary,
  getTeamMemberIds,
} from "./routes/shared";
import { randomUUID } from "crypto";


import { notifyUserCreated } from "./notificationService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check — no auth, no DB round-trip
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  // Register Object Storage routes for serving uploaded files
  registerObjectStorageRoutes(app, authMiddleware, storage);

  // Migration file upload route - admin only
  app.use(createMigrateFilesRouter(authMiddleware, requireRole("admin")));

  // Auth routes (login, register, logout, forgot-password, reset-password, me)
  registerAuthRoutes(app);

  // Extracted domain route modules
  registerBillingRoutes(app);
  registerContractRoutes(app);
  registerNotificationRoutes(app);
  registerOooRoutes(app);
  registerOvertimeRoutes(app);
  registerExpensesRoutes(app);
  registerTimesheetRoutes(app);
  registerInvoiceRoutes(app);
  registerEvaluationRoutes(app);

  // User routes - protected with auth middleware
  app.get("/api/users", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (req, res) => {
    const orgId = req.authenticatedUser!.organizationId ?? undefined;
    const users = await storage.getAllUsers(orgId);
    const usersWithoutPasswords = users.map(({ password: _, ...u }) => u);
    res.json(usersWithoutPasswords);
  }));

  app.get("/api/users/managers", authMiddleware, asyncHandler(async (req, res) => {
    const managers = await storage.getManagers(req.authenticatedUser!.organizationId ?? undefined);
    const managersWithoutPasswords = managers.map(({ password: _, ...u }) => u);
    res.json(managersWithoutPasswords);
  }));

  app.get("/api/users/supervisors", authMiddleware, asyncHandler(async (req, res) => {
    const supervisors = await storage.getSupervisors(req.authenticatedUser!.organizationId ?? undefined);
    const supervisorsWithoutPasswords = supervisors.map(({ password: _, ...u }) => u);
    res.json(supervisorsWithoutPasswords);
  }));

  // Basic user info for evaluation displays - accessible by all authenticated users
  // Non-supervisors only get limited info (themselves and their supervisor)
  app.get("/api/users/basic", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    
    const users = await storage.getAllUsers(currentUser.organizationId ?? undefined);
    // Return only essential info for display purposes
    const basicUsers = users.map(({ id, firstName, lastName, jobTitle, role }) => ({
      id,
      firstName,
      lastName,
      jobTitle,
      role,
    }));
    
    if (isSupervisor) {
      // Supervisors get all users
      res.json(basicUsers);
    } else {
      // Non-supervisors get themselves and their supervisor for evaluation displays
      // Always include current user even if supervisorId is null
      const relevantUsers = basicUsers.filter(u => 
        u.id === currentUser.id || 
        (currentUser.supervisorId && u.id === currentUser.supervisorId)
      );
      res.json(relevantUsers);
    }
  }));

  app.get("/api/team/members", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    const { supervisorId } = req.query;
    if (supervisorId) {
      const members = await storage.getUsersBySupervisor(supervisorId as string);
      const membersWithoutPasswords = members.map(({ password: _, ...u }) => u);
      res.json(membersWithoutPasswords);
    } else {
      const ics = await storage.getUsersByRole("ic", currentUser.organizationId ?? undefined);
      const icsWithoutPasswords = ics.map(({ password: _, ...u }) => u);
      res.json(icsWithoutPasswords);
    }
  }));

  // Get single user by ID - for supervisors viewing team member details
  app.get("/api/users/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isSelf = currentUser.id === targetUserId;
    
    // Check if supervisor and target is in their direct reports
    let isDirectReport = false;
    if (!isAdmin && !isSelf) {
      const directReports = await storage.getUsersBySupervisor(currentUser.id);
      isDirectReport = directReports.some(u => u.id === targetUserId);
    }
    
    if (!isAdmin && !isSelf && !isDirectReport) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    
    const user = await storage.getUser(targetUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!checkOrgBoundary(currentUser, user)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  }));

  app.post("/api/users", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    try {
      // Check for existing username
      const existingByUsername = await storage.getUserByUsername(req.body.username);
      if (existingByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Check for existing email
      const allUsers = await storage.getAllUsers(req.authenticatedUser!.organizationId ?? undefined);
      const existingByEmail = allUsers.find(u => u.email === req.body.email);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const currentUser = req.authenticatedUser!;

      // Allowlist permitted fields — prevent privilege injection via req.body
      const {
        username,
        password,
        email,
        firstName,
        lastName,
        jobTitle,
        phone,
        supervisorId,
        managerId,
        hourlyRate,
        monthlyCap,
        currency,
        startDate,
        role: requestedRole,
        isActive: requestedIsActive,
        organizationId: requestedOrgId,
      } = req.body;

      // Only owners can set roles above "ic"; admins cannot escalate to owner
      const allowedRoles = ["ic", "admin"] as const;
      type AllowedRole = typeof allowedRoles[number];
      let role: string = "ic";
      if (currentUser.role === "owner" && requestedRole) {
        role = requestedRole;
      } else if (currentUser.role === "admin" && requestedRole && allowedRoles.includes(requestedRole as AllowedRole)) {
        role = requestedRole;
      }

      // Reject attempts to assign user to a different organization
      if (requestedOrgId && requestedOrgId !== currentUser.organizationId) {
        return res.status(403).json({ error: "Cannot create a user in a different organization" });
      }

      const userData = {
        username,
        password,
        email,
        firstName,
        lastName,
        jobTitle,
        supervisorId,
        managerId,
        hourlyRate,
        monthlyCap,
        currency: normalizeCurrencyInput(currency) || "USD",
        role,
        isActive: requestedIsActive !== undefined ? requestedIsActive : true,
        organizationId: currentUser.organizationId,
      };

      if (!username || !password || !email || !firstName || !lastName) {
        return res.status(400).json({ error: "Required fields missing: username, password, email, firstName, lastName" });
      }

      const user = await storage.createUser(userData);
      
      try {
        await storage.createActivityLog({
          userId: req.body.createdBy || user.id,
          organizationId: req.authenticatedUser!.organizationId,
          action: "User created",
          details: `Created user ${user.firstName} ${user.lastName}`,
          entityType: "user",
          entityId: user.id,
        });
        await notifyUserCreated(user, req.body.createdBy);
      } catch (e) {
        console.error("Failed to create activity log or notification:", e);
      }

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    
    // Users can only edit their own profile unless they're admin
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isSelf = currentUser.id === targetUserId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Cannot edit other users' profiles" });
    }
    
    if (isAdmin && !isSelf) {
      const targetUser = await storage.getUser(targetUserId);
      if (targetUser && !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    }

    // Always block organizationId changes regardless of role
    if ("organizationId" in req.body) {
      return res.status(403).json({ error: "Cannot modify organizationId" });
    }
    
    if (!isAdmin) {
      const sensitiveFields = ["role", "isActive", "managerId", "hourlyRate", "monthlyCap"];
      for (const field of sensitiveFields) {
        if (field in req.body) {
          return res.status(403).json({ error: `Cannot modify ${field} - admin only` });
        }
      }
    }

    // Allowlist fields that may be updated — strip everything else
    const {
      firstName,
      lastName,
      email,
      jobTitle,
      phone,
      supervisorId,
      managerId,
      hourlyRate,
      monthlyCap,
      currency,
      startDate,
      role,
      isActive,
      avatar,
    } = req.body;

    const allowedUpdates: Record<string, any> = {};
    if (firstName !== undefined) allowedUpdates.firstName = firstName;
    if (lastName !== undefined) allowedUpdates.lastName = lastName;
    if (email !== undefined) allowedUpdates.email = email;
    if (jobTitle !== undefined) allowedUpdates.jobTitle = jobTitle;
    if (phone !== undefined) allowedUpdates.phone = phone;
    if (avatar !== undefined) allowedUpdates.avatar = avatar;
    if (currency !== undefined) {
      const normalized = normalizeCurrencyInput(currency);
      if (!normalized) {
        return res.status(400).json({ error: "Unsupported currency code" });
      }
      allowedUpdates.currency = normalized;
    }
    if (isAdmin) {
      if (supervisorId !== undefined) allowedUpdates.supervisorId = supervisorId;
      if (managerId !== undefined) allowedUpdates.managerId = managerId;
      if (hourlyRate !== undefined) allowedUpdates.hourlyRate = hourlyRate;
      if (monthlyCap !== undefined) allowedUpdates.monthlyCap = monthlyCap;
      if (startDate !== undefined) allowedUpdates.startDate = startDate;
      if (role !== undefined) allowedUpdates.role = role;
      if (isActive !== undefined) allowedUpdates.isActive = isActive;
    }
    
    const user = await storage.updateUser(targetUserId, allowedUpdates);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  }));

  app.patch("/api/users/:id/password", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isSelf = currentUser.id === targetUserId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Cannot change other users' passwords" });
    }

    const userRecord = await storage.getUser(targetUserId);
    if (!userRecord) {
      return res.status(404).json({ error: "User not found" });
    }

    if (isAdmin && !isSelf && !checkOrgBoundary(currentUser, userRecord)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }
    
    const { newPassword, currentPassword } = req.body;
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: "Password must be at least 12 characters" });
    }

    // Self-change requires current password verification; admins changing another user's
    // password skip it (they use an admin reset flow, not the same form).
    if (isSelf) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }
      const isValid = await comparePassword(currentPassword, userRecord.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }
    
    // Update password and set mustChangePassword to false
    const user = await storage.updateUser(targetUserId, { 
      password: newPassword,
      mustChangePassword: false 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    try {
      await storage.createActivityLog({
        userId: targetUserId,
        organizationId: req.authenticatedUser!.organizationId,
        action: "Password changed",
        details: `Password changed successfully`,
        entityType: "user",
        entityId: targetUserId,
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Onboarding tour completion endpoint
  app.patch("/api/users/:id/onboarding", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    
    // Users can only update their own onboarding status
    const isSelf = currentUser.id === targetUserId;
    if (!isSelf) {
      return res.status(403).json({ error: "Cannot update other users' onboarding status" });
    }
    
    const { tour, completed } = req.body;
    const validTours = ["portal", "timesheets", "invoices", "ooo", "supervisor", "owner"];
    
    if (!tour || !validTours.includes(tour)) {
      return res.status(400).json({ error: "Invalid tour name. Must be one of: portal, timesheets, invoices, ooo, supervisor, owner" });
    }
    
    if (typeof completed !== "boolean") {
      return res.status(400).json({ error: "completed must be a boolean" });
    }
    
    const user = await storage.getUser(targetUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update the completedOnboarding JSONB field
    const currentOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    const updatedOnboarding = { ...currentOnboarding, [tour]: completed };
    
    const updatedUser = await storage.updateUser(targetUserId, {
      completedOnboarding: updatedOnboarding
    });
    
    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to update onboarding status" });
    }
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  });

  app.delete("/api/users/:id", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!checkOrgBoundary(req.authenticatedUser!, targetUser)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }
    const success = await storage.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }

    try {
      await storage.createActivityLog({
        userId: req.params.id,
        organizationId: req.authenticatedUser!.organizationId,
        action: "User deleted",
        details: `User account removed`,
        entityType: "user",
        entityId: req.params.id,
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    res.status(204).send();
  });

  app.post("/api/users/bulk", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ error: "No users provided" });
      }

      const currentUser = req.authenticatedUser!;
      const callerOrgId = currentUser.organizationId;

      const validRoles = ["ic", "admin"];
      if (currentUser.role === "owner") validRoles.push("owner");

      const existingOrgUsers = await storage.getAllUsers(callerOrgId ?? undefined);
      const existingEmails = new Set(existingOrgUsers.map(u => u.email?.toLowerCase()));

      const seenInPayload = new Set<string>();
      const createdUsers = [];
      for (const userData of users) {
        try {
          const {
            username,
            password,
            email,
            firstName,
            lastName,
            jobTitle,
            phone,
            supervisorId,
            managerId,
            hourlyRate,
            monthlyCap,
            currency,
            startDate,
            role: requestedRole,
          } = userData;

          if (!username || !password || !email || !firstName || !lastName) {
            console.error("Skipping bulk user — required fields missing:", email);
            continue;
          }

          const emailKey = (email as string).toLowerCase();
          const usernameKey = (username as string).toLowerCase();

          if (seenInPayload.has(emailKey) || seenInPayload.has(usernameKey)) {
            console.error("Skipping bulk user — duplicate within payload:", email);
            continue;
          }

          const existingByUsername = await storage.getUserByUsername(username);
          if (existingByUsername) {
            console.error("Skipping bulk user — username already in use:", username);
            continue;
          }

          if (existingEmails.has(emailKey)) {
            console.error("Skipping bulk user — email already in use within org:", email);
            continue;
          }

          seenInPayload.add(emailKey);
          seenInPayload.add(usernameKey);
          existingEmails.add(emailKey);

          const role = requestedRole && validRoles.includes(requestedRole) ? requestedRole : "ic";

          const user = await storage.createUser({
            username,
            password,
            email,
            firstName,
            lastName,
            jobTitle,
            supervisorId,
            managerId,
            hourlyRate,
            monthlyCap,
            currency: normalizeCurrencyInput(currency) || "USD",
            role,
            organizationId: callerOrgId,
            isActive: true,
          });
          createdUsers.push(user);
        } catch (e) {
          console.error("Failed to create user:", userData.email, e);
        }
      }

      res.status(201).json({ 
        created: createdUsers.length,
        total: users.length 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk create users" });
    }
  });

  app.post("/api/users/:id/reset-password", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!checkOrgBoundary(req.authenticatedUser!, user)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    // 16 hex chars = 64 bits of entropy, always >= 16 chars so it passes the 12-char policy
    const tempPassword = randomUUID().replace(/-/g, "").slice(0, 16);
    await storage.updateUser(req.params.id, { password: tempPassword, mustChangePassword: true });

    try {
      await storage.createActivityLog({
        userId: req.params.id,
        organizationId: req.authenticatedUser!.organizationId,
        action: "Password reset",
        details: `Password reset for ${user.firstName} ${user.lastName}`,
        entityType: "user",
        entityId: req.params.id,
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    // Return the temp password so the admin can communicate it out of band.
    // The user is forced to change it on next login (mustChangePassword: true).
    res.json({ message: "Password reset successfully", tempPassword });
  });

  // OOO requests → server/routes/ooo.ts

  // Timesheets → server/routes/timesheets.ts


  // Notifications, org, activity-logs, billing → server/routes/notifications.ts and billing.ts

  // ── SEO / Public content routes ──────────────────────────────────────────
  // These must be registered BEFORE the SPA catch-all in vite.ts / static.ts
  // so that Googlebot receives fully server-rendered HTML.

  const { getBlogIndexHtml, getBlogArticleHtml } = await import("./seo/blogPages");
  const { addSubscriber, isValidEmail } = await import("./seo/emailCapture");
  const { getFaqHtml } = await import("./seo/faqPages");
  const { getArticles: getBlogArticles, createArticle, updateArticle, deleteArticle, BlogNotFoundError, BlogConflictError } = await import("./seo/blogStorage");
  const { FAQ_LAST_UPDATED } = await import("./seo/faqData");
  const { recordView, getAllViewStats } = await import("./seo/blogViews");
  const {
    getIndustryHtml,
    getCompetitorHtml,
    getIndustriesIndexHtml,
    getCompetitorsIndexHtml,
  } = await import("./seo/programmaticPages");
  const {
    getIndustries,
    getCompetitors,
    getPublishedIndustries,
    getPublishedCompetitors,
    createIndustry,
    updateIndustry,
    deleteIndustry,
    createCompetitor,
    updateCompetitor,
    deleteCompetitor,
    ProgrammaticNotFoundError,
    ProgrammaticConflictError,
  } = await import("./seo/programmaticStorage");

  const SEO_CACHE = "public, max-age=86400, stale-while-revalidate=3600";
  // Blog pages are user-editable; use a shorter cache so edits appear within minutes
  const BLOG_CACHE = "public, max-age=300, stale-while-revalidate=60";

  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function validateBlogArticleBody(body: Record<string, any>): string | null {
    const { slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml } = body;
    if (!slug || !title || !metaDescription || !publishedDate || !updatedDate || readingMinutes == null || !excerpt || !bodyHtml) {
      return "All fields are required: slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml";
    }
    if (!SLUG_RE.test(slug)) return "slug must contain only lowercase letters, numbers, and hyphens";
    if (!DATE_RE.test(publishedDate)) return "publishedDate must be in YYYY-MM-DD format";
    if (!DATE_RE.test(updatedDate)) return "updatedDate must be in YYYY-MM-DD format";
    const mins = Number(readingMinutes);
    if (!Number.isInteger(mins) || mins < 1) return "readingMinutes must be a positive integer";
    if (typeof title !== "string" || title.trim().length === 0) return "title must not be empty";
    if (typeof metaDescription !== "string" || metaDescription.length > 160) return "metaDescription must be 160 characters or fewer";
    if (typeof excerpt !== "string" || excerpt.trim().length === 0) return "excerpt must not be empty";
    if (typeof bodyHtml !== "string" || bodyHtml.trim().length === 0) return "bodyHtml must not be empty";
    return null;
  }

  function handleBlogError(err: unknown, res: Response): void {
    if (err instanceof BlogNotFoundError || err instanceof BlogConflictError) {
      (res as any).status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }

  // ── Bulk approve/reject endpoints for managers ─────────────────────────
  // Each endpoint accepts { ids: string[], status: "approved"|"rejected", reviewNote?: string }
  // and returns { results: [{ id, success, error? }], successCount, failureCount }.
  // Per-item failures are non-fatal: successful items are committed individually,
  // failed items are surfaced with reasons. Each item is re-authorized server-side.

  // Timesheets bulk-review → server/routes/timesheets.ts

  // OOO, overtime, expenses bulk-review → server/routes/ooo.ts, overtime.ts, expenses.ts
  // Invoice bulk-review → server/routes/invoices.ts

  // ---------------------------------------------------------------------------
  // Analytics dashboard (admin/owner only)
  // ---------------------------------------------------------------------------
  app.get(
    "/api/analytics/:section",
    authMiddleware,
    requireRole("admin", "owner"),
    asyncHandler(async (req, res) => {
      const { section } = req.params;
      const orgId = req.authenticatedUser!.organizationId ?? undefined;
      const {
        parseFilters,
        getSpend,
        getHours,
        getOvertime,
        getOOO,
        getSLA,
        getHeadcount,
        joinCSVTables,
      } = await import("./analytics");
      const filters = parseFilters(req.query as Record<string, unknown>);
      const format = (req.query.format as string) === "csv" ? "csv" : "json";

      const sendCSV = (filename: string, csv: string) => {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csv);
      };

      switch (section) {
        case "spend": {
          const data = await getSpend(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-spend.csv`,
              joinCSVTables([
                {
                  title: `Spend by month (native amounts, cents)`,
                  columns: ["month", "currency", "amount"],
                  rows: data.series,
                },
                {
                  title: `Spend by month (converted to ${data.displayCurrency}, cents)`,
                  columns: ["month", "amount"],
                  rows: data.convertedSeries,
                },
                {
                  title: `Totals by currency`,
                  columns: ["currency", "amount", "amountInDisplay"],
                  rows: data.totalsByCurrency,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "hours": {
          const data = await getHours(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-hours.csv`,
              joinCSVTables([
                {
                  title: "Hours per contractor",
                  columns: ["userId", "name", "team", "monthlyCap", "totalHours", "monthsCounted", "utilizationPct"],
                  rows: data.perIC,
                },
                {
                  title: "Hours per team",
                  columns: ["team", "totalHours", "contractors"],
                  rows: data.perTeam,
                },
                {
                  title: "Hours by month",
                  columns: ["month", "totalHours"],
                  rows: data.trend,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "overtime": {
          const data = await getOvertime(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-overtime.csv`,
              joinCSVTables([
                {
                  title: "Overtime per contractor",
                  columns: ["userId", "name", "team", "approvedHours", "pendingHours", "requests"],
                  rows: data.perIC,
                },
                {
                  title: "Overtime per team",
                  columns: ["team", "approvedHours", "pendingHours", "requests"],
                  rows: data.perTeam,
                },
                {
                  title: "Overtime by month",
                  columns: ["month", "approvedHours"],
                  rows: data.trend,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "ooo": {
          const data = await getOOO(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-ooo.csv`,
              joinCSVTables([
                {
                  title: "OOO per contractor",
                  columns: ["userId", "name", "team", "totalDays", "requests"],
                  rows: data.perIC,
                },
                {
                  title: "OOO per team",
                  columns: ["team", "totalDays", "contractors"],
                  rows: data.perTeam,
                },
                {
                  title: "OOO by month",
                  columns: ["month", "totalDays"],
                  rows: data.trend,
                },
                {
                  title: "Upcoming OOO (next 90 days)",
                  columns: ["userId", "name", "team", "startDate", "endDate", "oooType"],
                  rows: data.upcoming,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "sla": {
          const data = await getSLA(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-sla.csv`,
              joinCSVTables([
                {
                  title: "Approvals SLA",
                  columns: ["type", "label", "decided", "pending", "medianHours", "p90Hours", "avgHours"],
                  rows: data.buckets,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "headcount": {
          const data = await getHeadcount(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-headcount.csv`,
              joinCSVTables([
                {
                  title: `Active contractors: ${data.activeContractors} of ${data.totalContractors}`,
                  columns: ["team", "count"],
                  rows: data.byTeam,
                },
                {
                  title: "By status",
                  columns: ["status", "count"],
                  rows: data.byStatus,
                },
                {
                  title: "Upcoming renewals (next 90 days)",
                  columns: ["contractId", "userId", "name", "title", "endDate", "daysToEnd"],
                  rows: data.upcomingRenewals,
                },
                {
                  title: "Contracts expired in range",
                  columns: ["contractId", "userId", "name", "title", "endDate"],
                  rows: data.expiredInRange,
                },
                {
                  title: "Churn",
                  columns: ["userId", "name", "team", "status"],
                  rows: data.churnUsers,
                },
              ])
            );
          }
          return res.json(data);
        }
        default:
          return res.status(404).json({ error: "Unknown analytics section" });
      }
    })
  );

  app.get("/api/admin/blog-subscribers", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    const { getSubscribers } = await import("./seo/emailCapture");
    res.json(await getSubscribers());
  }));

  app.get("/api/admin/blog", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(await getBlogArticles());
  }));

  app.get("/api/admin/blog-analytics", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    const [articles, viewStats] = await Promise.all([getBlogArticles(), getAllViewStats()]);
    const analytics = articles.map((a) => {
      const stats = viewStats[a.slug] ?? { views: 0, referrers: {} };
      return {
        slug: a.slug,
        title: a.title,
        publishedDate: a.publishedDate,
        views: stats.views,
        referrers: stats.referrers,
      };
    });
    analytics.sort((a, b) => b.views - a.views);
    res.json(analytics);
  }));

  app.post("/api/admin/blog", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const validationError = validateBlogArticleBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const { slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml } = req.body;
    try {
      const article = await createArticle({ slug, title, metaDescription, publishedDate, updatedDate, readingMinutes: Number(readingMinutes), excerpt, bodyHtml });
      res.status(201).json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.put("/api/admin/blog/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const { slug: _bodySlug, ...rawUpdates } = req.body;
    const updates: Record<string, any> = {};
    const allowed = ["title", "metaDescription", "publishedDate", "updatedDate", "readingMinutes", "excerpt", "bodyHtml"] as const;
    for (const key of allowed) {
      if (rawUpdates[key] !== undefined) updates[key] = rawUpdates[key];
    }
    if (updates.readingMinutes !== undefined) {
      const mins = Number(updates.readingMinutes);
      if (!Number.isInteger(mins) || mins < 1) return res.status(400).json({ error: "readingMinutes must be a positive integer" });
      updates.readingMinutes = mins;
    }
    if (updates.publishedDate !== undefined && !DATE_RE.test(updates.publishedDate)) {
      return res.status(400).json({ error: "publishedDate must be in YYYY-MM-DD format" });
    }
    if (updates.updatedDate !== undefined && !DATE_RE.test(updates.updatedDate)) {
      return res.status(400).json({ error: "updatedDate must be in YYYY-MM-DD format" });
    }
    if (updates.metaDescription !== undefined && updates.metaDescription.length > 160) {
      return res.status(400).json({ error: "metaDescription must be 160 characters or fewer" });
    }
    try {
      const article = await updateArticle(req.params.slug, updates);
      res.json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.delete("/api/admin/blog/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try {
      await deleteArticle(req.params.slug);
      res.json({ success: true });
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.post("/api/blog/subscribe", asyncHandler(async (req, res) => {
    const email = (req.body?.email ?? "").toString().trim();
    const rawReturnTo = (req.body?.returnTo ?? "/blog").toString().trim();
    const returnTo = /^\/blog(\/[a-z0-9-]*)?$/.test(rawReturnTo) ? rawReturnTo : "/blog";

    if (!email || !isValidEmail(email)) {
      const opts = { error: "Please enter a valid email address." };
      const html = returnTo.startsWith("/blog/")
        ? await getBlogArticleHtml(returnTo.replace("/blog/", ""), opts)
        : await getBlogIndexHtml(opts);
      if (!html) {
        res.redirect(`${returnTo}?error=invalid`);
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(html);
      return;
    }

    await addSubscriber(email, returnTo);
    res.redirect(`${returnTo}?subscribed=1`);
  }));

  app.get("/blog", asyncHandler(async (req, res) => {
    const subscribed = req.query.subscribed === "1";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", subscribed ? "no-store" : BLOG_CACHE);
    res.send(await getBlogIndexHtml({ subscribed }));
  }));

  app.get("/blog/:slug", asyncHandler(async (req, res) => {
    const subscribed = req.query.subscribed === "1";
    const html = await getBlogArticleHtml(req.params.slug, { subscribed });
    if (!html) {
      res.status(404).send("<h1>Article not found</h1>");
      return;
    }
    if (!subscribed) {
      await recordView(req.params.slug, req.headers.referer);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", subscribed ? "no-store" : BLOG_CACHE);
    res.send(html);
  }));

  // ── Programmatic SEO: industry pages ──
  app.get("/contractor-management-for-:industry", asyncHandler(async (req, res) => {
    const html = await getIndustryHtml(req.params.industry);
    if (!html) {
      res.status(404).send("<h1>Page not found</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(html);
  }));

  app.get("/industries", asyncHandler(async (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(await getIndustriesIndexHtml());
  }));

  // ── Programmatic SEO: competitor comparison pages ──
  app.get("/compare", asyncHandler(async (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(await getCompetitorsIndexHtml());
  }));

  app.get(/^\/([a-z0-9-]+-alternative)$/, asyncHandler(async (req, res) => {
    const slug = req.params[0];
    const html = await getCompetitorHtml(slug);
    if (!html) {
      res.status(404).send("<h1>Page not found</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(html);
  }));

  // ── Programmatic SEO: admin CRUD ──
  const ALLOWED_STATUSES = new Set(["draft", "published"]);
  function validateStatusField(b: any): string | null {
    if (b.status !== undefined && !ALLOWED_STATUSES.has(b.status)) {
      return `status must be "draft" or "published"`;
    }
    return null;
  }
  function validateIndustryBody(b: any, mode: "create" | "update" = "create"): string | null {
    if (b == null || typeof b !== "object") return "request body must be an object";
    const required = ["slug", "name", "shortName", "heroTitle", "metaTitle", "metaDescription", "intro", "painPoints", "useCases", "faqs", "updatedDate"];
    if (mode === "create") {
      for (const k of required) if (b[k] == null) return `Field "${k}" is required`;
    }
    if (b.slug !== undefined && !SLUG_RE.test(b.slug)) return "slug must be lowercase letters, numbers, and hyphens";
    if (b.metaDescription !== undefined && (typeof b.metaDescription !== "string" || b.metaDescription.length > 200)) return "metaDescription must be a string ≤ 200 chars";
    if (b.painPoints !== undefined && !Array.isArray(b.painPoints)) return "painPoints must be an array";
    if (b.useCases !== undefined && !Array.isArray(b.useCases)) return "useCases must be an array";
    if (b.faqs !== undefined && !Array.isArray(b.faqs)) return "faqs must be an array";
    return validateStatusField(b);
  }
  function validateCompetitorBody(b: any, mode: "create" | "update" = "create"): string | null {
    if (b == null || typeof b !== "object") return "request body must be an object";
    const required = ["slug", "competitorName", "metaTitle", "metaDescription", "intro", "positioning", "competitorWeaknesses", "teamflowStrengths", "comparison", "pricingNote", "faqs", "updatedDate"];
    if (mode === "create") {
      for (const k of required) if (b[k] == null) return `Field "${k}" is required`;
    }
    if (b.slug !== undefined) {
      if (!SLUG_RE.test(b.slug)) return "slug must be lowercase letters, numbers, and hyphens";
      if (!b.slug.endsWith("-alternative")) return "competitor slug must end with '-alternative'";
    }
    if (b.metaDescription !== undefined && (typeof b.metaDescription !== "string" || b.metaDescription.length > 200)) return "metaDescription must be a string ≤ 200 chars";
    if (b.competitorWeaknesses !== undefined && !Array.isArray(b.competitorWeaknesses)) return "competitorWeaknesses must be an array";
    if (b.teamflowStrengths !== undefined && !Array.isArray(b.teamflowStrengths)) return "teamflowStrengths must be an array";
    if (b.comparison !== undefined && !Array.isArray(b.comparison)) return "comparison must be an array";
    if (b.faqs !== undefined && !Array.isArray(b.faqs)) return "faqs must be an array";
    return validateStatusField(b);
  }
  function handleProgrammaticError(err: unknown, res: Response): void {
    if (err instanceof ProgrammaticNotFoundError || err instanceof ProgrammaticConflictError) {
      (res as any).status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }

  app.get("/api/admin/seo/industries", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(await getIndustries());
  }));
  app.post("/api/admin/seo/industries", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateIndustryBody(req.body);
    if (err) return res.status(400).json({ error: err });
    try { res.status(201).json(await createIndustry(req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.put("/api/admin/seo/industries/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateIndustryBody(req.body, "update");
    if (err) return res.status(400).json({ error: err });
    try { res.json(await updateIndustry(req.params.slug, req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.delete("/api/admin/seo/industries/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try { await deleteIndustry(req.params.slug); res.status(204).end(); } catch (e) { handleProgrammaticError(e, res); }
  }));

  app.get("/api/admin/seo/competitors", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(await getCompetitors());
  }));
  app.post("/api/admin/seo/competitors", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateCompetitorBody(req.body);
    if (err) return res.status(400).json({ error: err });
    try { res.status(201).json(await createCompetitor(req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.put("/api/admin/seo/competitors/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateCompetitorBody(req.body, "update");
    if (err) return res.status(400).json({ error: err });
    try { res.json(await updateCompetitor(req.params.slug, req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.delete("/api/admin/seo/competitors/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try { await deleteCompetitor(req.params.slug); res.status(204).end(); } catch (e) { handleProgrammaticError(e, res); }
  }));

  app.get("/faq", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(getFaqHtml());
  });

  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(
      `User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml\nSitemap: /sitemap-blog.xml\nSitemap: /sitemap-programmatic.xml\n`
    );
  });

  function buildSitemapXml(urls: Array<{ loc: string; lastmod: string; changefreq?: string; priority?: string }>): string {
    const urlEntries = urls
      .map(
        ({ loc, lastmod, changefreq = "monthly", priority = "0.7" }) =>
          `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
      )
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
  }

  const BASE_URL = "https://teamflow.app";

  app.get("/sitemap.xml", asyncHandler(async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const [articles, industries, competitors] = await Promise.all([
      getBlogArticles(),
      getPublishedIndustries(),
      getPublishedCompetitors(),
    ]);
    const mostRecentArticleDate = articles.reduce(
      (max, a) => (a.updatedDate > max ? a.updatedDate : max),
      articles[0]?.updatedDate ?? today
    );
    const articleUrls = articles.map((a) => ({
      loc: `${BASE_URL}/blog/${a.slug}`,
      lastmod: a.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.7",
    }));
    const industryUrls = industries.map((i) => ({
      loc: `${BASE_URL}/contractor-management-for-${i.slug}`,
      lastmod: i.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const competitorUrls = competitors.map((c) => ({
      loc: `${BASE_URL}/${c.slug}`,
      lastmod: c.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const xml = buildSitemapXml([
      { loc: `${BASE_URL}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
      { loc: `${BASE_URL}/blog`, lastmod: mostRecentArticleDate, changefreq: "weekly", priority: "0.9" },
      { loc: `${BASE_URL}/faq`, lastmod: FAQ_LAST_UPDATED, changefreq: "monthly", priority: "0.8" },
      { loc: `${BASE_URL}/industries`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      { loc: `${BASE_URL}/compare`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      { loc: `${BASE_URL}/signup`, lastmod: today, changefreq: "monthly", priority: "0.8" },
      ...articleUrls,
      ...industryUrls,
      ...competitorUrls,
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  }));

  app.get("/sitemap-programmatic.xml", asyncHandler(async (_req, res) => {
    const [industries, competitors] = await Promise.all([getPublishedIndustries(), getPublishedCompetitors()]);
    const industryUrls = industries.map((i) => ({
      loc: `${BASE_URL}/contractor-management-for-${i.slug}`,
      lastmod: i.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const competitorUrls = competitors.map((c) => ({
      loc: `${BASE_URL}/${c.slug}`,
      lastmod: c.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const today = new Date().toISOString().slice(0, 10);
    const xml = buildSitemapXml([
      { loc: `${BASE_URL}/industries`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      { loc: `${BASE_URL}/compare`, lastmod: today, changefreq: "weekly", priority: "0.85" },
      ...industryUrls,
      ...competitorUrls,
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  }));

  app.get("/sitemap-blog.xml", asyncHandler(async (_req, res) => {
    const articles = await getBlogArticles();
    const articleUrls = articles.map((a) => ({
      loc: `${BASE_URL}/blog/${a.slug}`,
      lastmod: a.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.7",
    }));
    const xml = buildSitemapXml([
      ...articleUrls,
      { loc: `${BASE_URL}/faq`, lastmod: FAQ_LAST_UPDATED, changefreq: "monthly", priority: "0.8" },
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  }));

  return httpServer;
}
