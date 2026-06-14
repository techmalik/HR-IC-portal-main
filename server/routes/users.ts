import type { Express } from "express";
import { randomUUID } from "crypto";
import { storage, comparePassword } from "../storage";
import { normalizeCurrencyInput } from "./helpers";
import { notifyUserCreated } from "../notificationService";
import {
  authMiddleware,
  requireRole,
  asyncHandler,
  hasSupervisorPrivileges,
  checkOrgBoundary,
} from "./shared";

export function registerUserRoutes(app: Express): void {
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

  app.get("/api/users/basic", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    const users = await storage.getAllUsers(currentUser.organizationId ?? undefined);
    const basicUsers = users.map(({ id, firstName, lastName, jobTitle, role }) => ({
      id, firstName, lastName, jobTitle, role,
    }));
    if (isSupervisor) {
      res.json(basicUsers);
    } else {
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

  app.get("/api/users/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isSelf = currentUser.id === targetUserId;

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
      const existingByUsername = await storage.getUserByUsername(req.body.username);
      if (existingByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const allUsers = await storage.getAllUsers(req.authenticatedUser!.organizationId ?? undefined);
      const existingByEmail = allUsers.find(u => u.email === req.body.email);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const currentUser = req.authenticatedUser!;

      const {
        username, password, email, firstName, lastName, jobTitle, phone,
        supervisorId, managerId, hourlyRate, monthlyCap, currency, startDate,
        role: requestedRole,
        isActive: requestedIsActive,
        organizationId: requestedOrgId,
      } = req.body;

      const allowedRoles = ["ic", "admin"] as const;
      type AllowedRole = typeof allowedRoles[number];
      let role: string = "ic";
      if (currentUser.role === "owner" && requestedRole) {
        role = requestedRole;
      } else if (currentUser.role === "admin" && requestedRole && allowedRoles.includes(requestedRole as AllowedRole)) {
        role = requestedRole;
      }

      if (requestedOrgId && requestedOrgId !== currentUser.organizationId) {
        return res.status(403).json({ error: "Cannot create a user in a different organization" });
      }

      if (!username || !password || !email || !firstName || !lastName) {
        return res.status(400).json({ error: "Required fields missing: username, password, email, firstName, lastName" });
      }

      const userData = {
        username, password, email, firstName, lastName, jobTitle,
        supervisorId, managerId, hourlyRate, monthlyCap,
        currency: normalizeCurrencyInput(currency) || "USD",
        role,
        isActive: requestedIsActive !== undefined ? requestedIsActive : true,
        organizationId: currentUser.organizationId,
      };

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

    const {
      firstName, lastName, email, jobTitle, phone, supervisorId, managerId,
      hourlyRate, monthlyCap, currency, startDate, role, isActive, avatar,
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
    if (isSelf) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }
      const isValid = await comparePassword(currentPassword, userRecord.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }

    const user = await storage.updateUser(targetUserId, { password: newPassword, mustChangePassword: false });
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

  app.patch("/api/users/:id/onboarding", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    if (currentUser.id !== targetUserId) {
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

    const currentOnboarding = (user.completedOnboarding as Record<string, boolean>) || {};
    const updatedOnboarding = { ...currentOnboarding, [tour]: completed };
    const updatedUser = await storage.updateUser(targetUserId, { completedOnboarding: updatedOnboarding });
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
            username, password, email, firstName, lastName, jobTitle,
            supervisorId, managerId, hourlyRate, monthlyCap, currency,
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
            username, password, email, firstName, lastName, jobTitle,
            supervisorId, managerId, hourlyRate, monthlyCap,
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

      res.status(201).json({ created: createdUsers.length, total: users.length });
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

    res.json({ message: "Password reset successfully", tempPassword });
  });
}
