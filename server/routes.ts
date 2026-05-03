import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, comparePassword } from "./storage";
import { createSession, invalidateSession, getUserIdFromToken } from "./sessionManager";
import type { User, UserRoleType, InsertContract, InsertExpense } from "@shared/schema";
import { ExpenseCategory } from "@shared/schema";

import { ObjectStorageService, registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { createMigrateFilesRouter } from "./migrate-files";
import { randomUUID } from "crypto";

// Helper function to check if a date is a weekend (Saturday or Sunday)
function isWeekend(dateString: string): boolean {
  const date = new Date(dateString);
  const day = date.getUTCDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

const objectStorageService = new ObjectStorageService();

// Allowed ISO 4217 currency codes for invoices/users — kept in sync with
// `client/src/lib/currency.ts` SUPPORTED_CURRENCIES.
const ALLOWED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "MXN", "BRL", "INR", "JPY",
  "CHF", "SEK", "NOK", "PLN", "ZAR", "ARS", "COP", "PHP", "SGD",
]);
function normalizeCurrencyInput(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  return ALLOWED_CURRENCIES.has(upper) ? upper : undefined;
}

// Helper function to normalize file URLs - converts absolute URLs to relative paths
function normalizeFileUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  
  // If it's a base64 data URL, return as-is (client can display directly)
  if (fileUrl.startsWith("data:")) {
    return fileUrl;
  }
  
  // If it's already a relative path, return as-is
  if (fileUrl.startsWith("/")) {
    return fileUrl;
  }
  
  // If it's an absolute URL, extract just the path
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    try {
      const url = new URL(fileUrl);
      return url.pathname; // Return just the path portion
    } catch {
      return fileUrl; // If URL parsing fails, return as-is
    }
  }
  
  return fileUrl;
}

// Helper function to upload base64 data URL to Object Storage and return public URL
async function uploadBase64ToObjectStorage(
  base64DataUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error("[ObjectStorage] Invalid base64 data URL format");
      return null;
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const { Client } = await import("@replit/object-storage");
    const storageClient = new Client();
    const objectId = randomUUID();
    const storagePath = `.private/uploads/${objectId}`;

    const uploadResult = await storageClient.uploadFromBytes(storagePath, buffer);
    if (!uploadResult.ok) {
      console.error("[ObjectStorage] Failed to upload file:", uploadResult.error);
      return null;
    }

    const objectPath = `/objects/uploads/${objectId}`;
    console.log(`[ObjectStorage] Uploaded ${fileName} to ${objectPath}`);
    return objectPath;
  } catch (error: any) {
    console.error("[ObjectStorage] Upload error:", error?.message || error);
    return null;
  }
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: User;
    }
  }
}

// Rate limiting state
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_LOGIN_ATTEMPTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts || (now - attempts.lastAttempt) > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// Get current user from session cookie
async function getCurrentUser(req: Request) {
  const token = req.cookies?.session_token;
  if (!token) {
    return null;
  }
  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return null;
  }
  return storage.getUser(userId);
}

// Authentication middleware - validates token and attaches user to request
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized - Invalid or missing token" });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: "Account is disabled" });
  }
  if (user.mustChangePassword) {
    const isPasswordChangePath = /^\/api\/users\/[^/]+\/password$/.test(req.path);
    const isLogoutPath = req.path === "/api/auth/logout";
    if (!isPasswordChangePath && !isLogoutPath) {
      return res.status(403).json({ error: "Password change required", mustChangePassword: true });
    }
  }
  req.authenticatedUser = user;
  next();
}

// Role-based authorization middleware
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.authenticatedUser;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    next();
  };
}

function checkOrgBoundary(currentUser: User, targetUser: { organizationId: string | null }): boolean {
  if (!currentUser.organizationId) return true;
  return currentUser.organizationId === targetUser.organizationId;
}

// Check if user has supervisor privileges (either admin or IC with direct reports)
async function hasSupervisorPrivileges(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  if (user.role === "admin" || user.role === "owner") return true;
  
  // Check if this IC has direct reports
  const directReports = await storage.getUsersBySupervisor(userId);
  return directReports.length > 0;
}

// Get the list of team member IDs for a supervisor
async function getTeamMemberIds(supervisorId: string): Promise<string[]> {
  const members = await storage.getUsersBySupervisor(supervisorId);
  return members.map(m => m.id);
}

// Centralized error handler
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`[API Error] ${req.method} ${req.path}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  };
}
import {
  notifyOOOSubmitted,
  notifyOOOApproved,
  notifyOOORejected,
  notifyTimesheetSubmitted,
  notifyTimesheetApproved,
  notifyTimesheetRejected,
  notifyOvertimeSubmitted,
  notifyOvertimeApproved,
  notifyOvertimeRejected,
  notifyInvoiceUploaded,
  notifyInvoiceApproved,
  notifyInvoiceRejected,
  notifyInvoiceRevisionRequested,
  notifyUserCreated,
  notifyExpenseSubmitted,
  notifyExpenseApproved,
  notifyExpenseRejected,
  createNotification,
} from "./notificationService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Object Storage routes for serving uploaded files
  registerObjectStorageRoutes(app);

  // Migration file upload route - admin only
  app.use(createMigrateFilesRouter(authMiddleware, requireRole("admin")));

  // Auth routes (no auth middleware - public endpoints)
  app.post("/api/auth/login", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: "Too many login attempts. Please wait 1 minute." });
    }
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    // Successful login - reset rate limit
    resetRateLimit(clientIp);

    const sessionToken = await createSession(user.id, user.username);

    try {
      await storage.createActivityLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: "User logged in",
        details: `${user.firstName} ${user.lastName} logged in`,
        entityType: "user",
        entityId: user.id,
      });
    } catch (e) {
      console.error("Failed to create login activity log:", e);
    }

    // Check if user has direct reports (for dynamic supervisor privileges)
    const directReports = await storage.getUsersBySupervisor(user.id);
    const hasDirectReports = directReports.length > 0;

    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, hasDirectReports });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { firstName, lastName, email, password, organizationName } = req.body;

    if (!firstName || !lastName || !email || !password || !organizationName) {
      return res.status(400).json({ error: "All fields are required: firstName, lastName, email, password, organizationName" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingByEmail = await storage.getUserByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const username = email;
    const existingByUsername = await storage.getUserByUsername(username);
    if (existingByUsername) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      || "org";
    let uniqueSlug = slug;
    let slugSuffix = 1;
    while (await storage.getOrganizationBySlug(uniqueSlug)) {
      uniqueSlug = `${slug}-${slugSuffix}`;
      slugSuffix++;
    }

    const organization = await storage.createOrganization({
      name: organizationName,
      slug: uniqueSlug,
      billingEmail: email,
    });

    const subscription = await storage.createSubscription({
      organizationId: organization.id,
      plan: "free",
      status: "active",
      seatCount: 1,
      maxSeats: 3,
      currentPeriodStart: new Date(),
    });

    const user = await storage.createUser({
      username,
      password,
      email,
      firstName,
      lastName,
      role: "owner",
      organizationId: organization.id,
      isActive: true,
    });

    const sessionToken = await createSession(user.id, user.username);

    try {
      await storage.createActivityLog({
        userId: user.id,
        organizationId: organization.id,
        action: "Organization created",
        details: `${firstName} ${lastName} created organization "${organizationName}"`,
        entityType: "organization",
        entityId: organization.id,
      });
    } catch (e) {
      console.error("Failed to create registration activity log:", e);
    }

    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ ...userWithoutPassword, hasDirectReports: false });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.session_token;
    if (token) {
      await invalidateSession(token);
    }
    res.clearCookie("session_token", { path: "/" });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - Invalid or missing token" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is disabled" });
    }
    const directReports = await storage.getUsersBySupervisor(user.id);
    const hasDirectReports = directReports.length > 0;
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, hasDirectReports });
  });

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

      // Only owners can set a role; default to "ic" otherwise
      const role = (currentUser.role === "owner" && requestedRole) ? requestedRole : (requestedRole || "ic");

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
        phone,
        supervisorId,
        managerId,
        hourlyRate,
        monthlyCap,
        currency: normalizeCurrencyInput(currency) || "USD",
        startDate,
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
    
    const { newPassword, currentPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // If currentPassword is provided (voluntary change via profile), verify it
    if (currentPassword) {
      const userRecord = await storage.getUser(targetUserId);
      if (!userRecord) {
        return res.status(404).json({ error: "User not found" });
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

      const createdUsers = [];
      for (const userData of users) {
        try {
          const user = await storage.createUser({
            ...userData,
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

    const tempPassword = "temp" + Math.random().toString(36).slice(2, 8);
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

  app.post("/api/ooo-requests", authMiddleware, async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      
      // Users can only create requests for themselves
      if (req.body.userId !== currentUser.id) {
        return res.status(403).json({ error: "Cannot create requests for other users" });
      }
      
      const request = await storage.createOOORequest({ ...req.body, organizationId: currentUser.organizationId });
      const submitter = await storage.getUser(req.body.userId);

      try {
        await storage.createActivityLog({
          userId: req.body.userId,
          organizationId: currentUser.organizationId,
          action: "OOO request created",
          details: `Requested time off from ${req.body.startDate} to ${req.body.endDate}`,
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

  app.patch("/api/ooo-requests/:id", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingRequest = await storage.getOOORequest(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (req.body.reviewedBy) {
      req.body.reviewedBy = currentUser.id;
    }

    if (currentUser.id === existingRequest.userId && 
        (req.body.status === "approved" || req.body.status === "rejected") &&
        currentUser.role !== "admin") {
      return res.status(403).json({ error: "You cannot approve or reject your own request" });
    }

    const request = await storage.updateOOORequest(req.params.id, {
      ...req.body,
      reviewedAt: new Date(),
    });

    if (!request) {
      return res.status(500).json({ error: "Failed to update request" });
    }

    try {
      await storage.createActivityLog({
        userId: req.body.reviewedBy,
        organizationId: currentUser.organizationId,
        action: `OOO request ${req.body.status}`,
        details: `Leave request was ${req.body.status}`,
        entityType: "ooo_request",
        entityId: request.id,
      });

      if (req.body.reviewedBy && req.body.status) {
        const reviewer = await storage.getUser(req.body.reviewedBy);
        if (reviewer) {
          if (req.body.status === "approved") {
            await notifyOOOApproved(request, reviewer);
          } else if (req.body.status === "rejected") {
            await notifyOOORejected(request, reviewer, req.body.reviewNote);
          }
        }
      }
    } catch (e) {
      console.error("Failed to create activity log or notification:", e);
    }

    res.json(request);
  });

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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
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

  app.get("/api/timesheets/:id/entries", authMiddleware, async (req, res) => {
    const entries = await storage.getDailyEntriesByTimesheet(req.params.id);
    res.json(entries);
  });

  app.post("/api/timesheets/save", authMiddleware, asyncHandler(async (req, res) => {
    const { userId, month, year, entries } = req.body;

    if (!userId || month === undefined || year === undefined || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Required fields missing: userId, month, year, entries" });
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
    
    const totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);
    
    if (timesheet) {
      await storage.deleteDailyEntriesByTimesheet(timesheet.id);
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
        organizationId: req.authenticatedUser!.organizationId,
      });
    }

    for (const entry of entries) {
      await storage.createDailyEntry({
        timesheetId: timesheet.id,
        date: entry.date,
        hours: entry.hours,
        activityLog: entry.activityLog,
        organizationId: req.authenticatedUser!.organizationId,
      });
      
      // Auto-create overtime request for entries > 8 hours OR weekend work
      const STANDARD_HOURS = 8;
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
            organizationId: req.authenticatedUser!.organizationId,
          });
        } else if (existingOT.isWeekendWork !== isWeekendEntry) {
          // Update existing request if weekend status changed
          await storage.updateOvertimeRequest(existingOT.id, {
            isWeekendWork: isWeekendEntry,
          });
        }
      }
    }

    res.json(timesheet);
  }));

  app.post("/api/timesheets/submit", authMiddleware, asyncHandler(async (req, res) => {
    const { userId, month, year, entries } = req.body;

    if (!userId || month === undefined || year === undefined || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Required fields missing: userId, month, year, entries" });
    }
    
    let timesheet = await storage.getTimesheetByUserAndMonth(userId, month, year);
    
    const totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);
    
    if (timesheet) {
      await storage.deleteDailyEntriesByTimesheet(timesheet.id);
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
        organizationId: req.authenticatedUser!.organizationId,
      });
      const updated = await storage.updateTimesheet(created.id, {
        submittedAt: new Date(),
      });
      if (!updated) {
        return res.status(500).json({ error: "Failed to update timesheet" });
      }
      timesheet = updated;
    }

    for (const entry of entries) {
      await storage.createDailyEntry({
        timesheetId: timesheet.id,
        date: entry.date,
        hours: entry.hours,
        activityLog: entry.activityLog,
        organizationId: req.authenticatedUser!.organizationId,
      });
      
      // Auto-create overtime request for entries > 8 hours OR weekend work
      const STANDARD_HOURS = 8;
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
            organizationId: req.authenticatedUser!.organizationId,
          });
        } else if (existingOT.isWeekendWork !== isWeekendEntry) {
          // Update existing request if weekend status changed
          await storage.updateOvertimeRequest(existingOT.id, {
            isWeekendWork: isWeekendEntry,
          });
        }
      }
    }

    await storage.createActivityLog({
      userId,
      organizationId: req.authenticatedUser!.organizationId,
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

    // Derive reviewedBy from the authenticated user — never trust the client-supplied value
    const isApprovalAction = req.body.status === "approved" || req.body.status === "rejected";
    if (isApprovalAction) {
      if (currentUser.id === existingTimesheet.userId) {
        return res.status(403).json({ error: "You cannot approve or reject your own timesheet" });
      }
    }

    // Strip client-supplied reviewedBy; use the server-verified identity instead
    const { reviewedBy: _ignored, ...bodyWithoutReviewedBy } = req.body;
    const updatePayload: Record<string, any> = { ...bodyWithoutReviewedBy, reviewedAt: new Date() };
    if (isApprovalAction) {
      updatePayload.reviewedBy = currentUser.id;
    }

    const timesheet = await storage.updateTimesheet(req.params.id, updatePayload);

    if (!timesheet) {
      return res.status(500).json({ error: "Failed to update timesheet" });
    }

    if (isApprovalAction) {
      const reviewer = await storage.getUser(currentUser.id);
      if (reviewer) {
        if (req.body.status === "approved") {
          await notifyTimesheetApproved(timesheet, existingTimesheet.userId, reviewer);
        } else if (req.body.status === "rejected") {
          await notifyTimesheetRejected(timesheet, existingTimesheet.userId, reviewer, req.body.reviewNote);
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

      // Verify the user is a supervisor of the timesheet owner
      const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
      if (!isSupervisor) {
        return res.status(403).json({ error: "Only supervisors can unlock timesheets" });
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
      const icUser = await storage.getUser(timesheet.userId);
      if (icUser) {
        // Notification would go here (using existing notification patterns)
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
    const currentUser = req.authenticatedUser!;
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
      
      const request = await storage.createOvertimeRequest({ ...req.body, organizationId: req.authenticatedUser!.organizationId });
      const submitter = await storage.getUser(req.body.userId);

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

  app.patch("/api/overtime-requests/:id", authMiddleware, async (req, res) => {
    const existingRequest = await storage.getOvertimeRequest(req.params.id);
    
    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (req.body.reviewedBy && req.body.reviewedBy === existingRequest.userId && 
        (req.body.status === "approved" || req.body.status === "rejected")) {
      return res.status(403).json({ error: "You cannot approve or reject your own overtime request" });
    }

    // Validate approvedHours if provided
    if (req.body.status === "approved" && req.body.approvedHours !== undefined) {
      const approvedHours = Number(req.body.approvedHours);
      if (isNaN(approvedHours) || approvedHours < 1 || approvedHours > existingRequest.requestedHours) {
        return res.status(400).json({ 
          error: `Approved hours must be between 1 and ${existingRequest.requestedHours}` 
        });
      }
    }

    const request = await storage.updateOvertimeRequest(req.params.id, {
      ...req.body,
      reviewedAt: new Date(),
    });

    if (!request) {
      return res.status(500).json({ error: "Failed to update overtime request" });
    }

    // If overtime is rejected, reset the daily entry hours to 8 (max normal hours)
    // and recalculate the timesheet total from all entries for accuracy
    if (req.body.status === "rejected") {
      try {
        const dailyEntry = await storage.getDailyEntryByTimesheetAndDate(
          existingRequest.timesheetId,
          existingRequest.date
        );
        if (dailyEntry && dailyEntry.hours > 8) {
          await storage.updateDailyEntry(dailyEntry.id, { hours: 8 });
          // Recalculate the timesheet's total hours from all entries for accuracy
          const allEntries = await storage.getDailyEntriesByTimesheet(existingRequest.timesheetId);
          const newTotal = allEntries.reduce((sum, entry) => {
            // Use 8 for the just-updated entry, actual hours for others
            return sum + (entry.id === dailyEntry.id ? 8 : entry.hours);
          }, 0);
          await storage.updateTimesheet(existingRequest.timesheetId, {
            totalHours: newTotal
          });
        }
      } catch (e) {
        console.error("Failed to reset daily entry hours after overtime rejection:", e);
      }
    }

    try {
      await storage.createActivityLog({
        userId: req.body.reviewedBy,
        organizationId: req.authenticatedUser!.organizationId,
        action: `Overtime request ${req.body.status}`,
        details: `Overtime request was ${req.body.status}`,
        entityType: "overtime_request",
        entityId: request.id,
      });

      if (req.body.reviewedBy && req.body.status) {
        const reviewer = await storage.getUser(req.body.reviewedBy);
        if (reviewer) {
          if (req.body.status === "approved") {
            await notifyOvertimeApproved(request, reviewer);
          } else if (req.body.status === "rejected") {
            await notifyOvertimeRejected(request, reviewer, req.body.reviewNote);
          }
        }
      }
    } catch (e) {
      console.error("Failed to create activity log or notification:", e);
    }

    res.json(request);
  });

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

  // Invoice routes - protected
  app.get("/api/invoices", authMiddleware, async (req, res) => {
    const { userId } = req.query;
    let invoices;
    if (userId) {
      invoices = await storage.getInvoicesByUser(userId as string);
    } else {
      invoices = await storage.getAllInvoices(req.authenticatedUser!.organizationId ?? undefined);
    }
    
    // Enrich invoices with user data and normalize file URLs
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
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
      const { userId, month, year } = req.body;
      
      // Link invoice to timesheet if exists
      const timesheet = await storage.getTimesheetByUserAndMonth(userId, month, year);

      // Default invoice currency to the contractor's preferred currency
      let invoiceCurrency = normalizeCurrencyInput(req.body.currency) || "";
      if (!invoiceCurrency && userId) {
        const invoiceUser = await storage.getUser(userId);
        invoiceCurrency = normalizeCurrencyInput(invoiceUser?.currency) || "USD";
      }
      if (!invoiceCurrency) invoiceCurrency = "USD";

      const invoiceData = {
        ...req.body,
        currency: invoiceCurrency,
        status: "pending_review",
        timesheetId: timesheet?.id || null,
        organizationId: req.authenticatedUser!.organizationId,
      };
      
      const invoice = await storage.createInvoice(invoiceData);

      // When invoice is submitted, auto-submit timesheet if in draft status
      if (timesheet && timesheet.status === "draft") {
        await storage.updateTimesheet(timesheet.id, {
          status: "submitted",
          submittedAt: new Date(),
        });

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
        userId: req.body.userId,
        organizationId: req.authenticatedUser!.organizationId,
        action: "Invoice submitted for review",
        details: `Submitted invoice ${req.body.fileName} for approval`,
        entityType: "invoice",
        entityId: invoice.id,
      });

      const uploader = await storage.getUser(invoice.userId);
      if (uploader) {
        await notifyInvoiceUploaded(invoice, uploader);
      }

      // Upload to Object Storage before responding so failures are surfaced to the client
      let finalFileUrl = invoice.fileUrl;
      if (invoice.fileUrl && invoice.fileUrl.startsWith("data:")) {
        const uploadedUrl = await uploadBase64ToObjectStorage(
          invoice.fileUrl,
          invoice.fileName
        );
        if (!uploadedUrl) {
          // Roll back the created invoice record so no stale data:// URL is left in the DB
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

  app.get("/api/invoices/:id", authMiddleware, async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
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
    
    // Only allow deleting rejected invoices or pending ones by the owner
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

  // Invoice approval/rejection route (for supervisors)
  app.patch("/api/invoices/:id", authMiddleware, async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const user = req.authenticatedUser!;
    const { status, reviewNote } = req.body;

    // Prevent self-approval
    if (user.id === invoice.userId && (status === "approved" || status === "rejected")) {
      return res.status(403).json({ error: "You cannot approve or reject your own invoice" });
    }

    // Check if user has supervisor privileges
    const isSupervisor = await hasSupervisorPrivileges(user.id);
    if (!isSupervisor && status) {
      return res.status(403).json({ error: "Insufficient permissions to review invoices" });
    }

    // Prevent re-reviewing approved invoices
    if (invoice.status === "approved" && status) {
      return res.status(400).json({ error: "This invoice has already been approved and cannot be changed" });
    }
    // Prevent reviewing paid invoices via this route
    if (invoice.status === "paid" && status) {
      return res.status(400).json({ error: "This invoice has been paid and cannot be changed" });
    }

    const updates: any = {
      ...req.body,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    };

    const updatedInvoice = await storage.updateInvoice(req.params.id, updates);
    if (!updatedInvoice) {
      return res.status(500).json({ error: "Failed to update invoice" });
    }

    if (status === "approved") {
      
      await notifyInvoiceApproved(updatedInvoice, invoice.userId, user);

      // Also approve the linked timesheet if it exists
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

    // Handle rejection
    if (status === "rejected") {
      await notifyInvoiceRejected(updatedInvoice, invoice.userId, user, reviewNote);

      // Reset the linked timesheet back to draft so IC can make corrections
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

    // Handle revision request (admin can request revision without resetting timesheet)
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
  });

  // Mark invoice as paid (admin/owner only)
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

    res.json({
      ...updated,
      fileUrl: normalizeFileUrl(updated.fileUrl),
    });
  }));

  // Get pending invoices for review (for supervisors)
  app.get("/api/team/invoices", authMiddleware, async (req, res) => {
    const user = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(user.id);
    
    if (!isSupervisor) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Get all pending invoices
    const pendingInvoices = await storage.getPendingInvoices(user.organizationId ?? undefined);
    
    // Enrich with user data and normalize file URLs
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

  // Get pending invoice count for supervisor badge
  app.get("/api/invoices/pending-count", authMiddleware, async (req, res) => {
    const user = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(user.id);
    
    if (!isSupervisor) {
      return res.json({ count: 0 });
    }

    const pendingInvoices = await storage.getPendingInvoices(user.organizationId ?? undefined);
    res.json({ count: pendingInvoices.length });
  });

  // Invoice Line Items routes - protected
  app.get("/api/invoices/:invoiceId/line-items", authMiddleware, async (req, res) => {
    const lineItems = await storage.getInvoiceLineItems(req.params.invoiceId);
    res.json(lineItems);
  });

  app.post("/api/invoices/:invoiceId/line-items", authMiddleware, async (req, res) => {
    try {
      const lineItem = await storage.createInvoiceLineItem({
        ...req.body,
        invoiceId: req.params.invoiceId,
        organizationId: req.authenticatedUser!.organizationId,
      });
      res.status(201).json(lineItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create line item" });
    }
  });

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
    if (!details) {
      return res.json(null);
    }
    res.json(details);
  });

  app.post("/api/ic-payment-details", authMiddleware, async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const targetUserId = req.body.userId;
      if (currentUser.id !== targetUserId) {
        return res.status(403).json({ error: "Can only manage your own payment details" });
      }
      const existing = await storage.getIcPaymentDetails(targetUserId);
      if (existing) {
        const updated = await storage.updateIcPaymentDetails(targetUserId, { ...req.body, organizationId: currentUser.organizationId });
        return res.json(updated);
      }
      const details = await storage.createIcPaymentDetails({ ...req.body, organizationId: currentUser.organizationId });
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

  // IC Responsibilities routes - protected
  app.get("/api/ic-responsibilities/:icId", authMiddleware, async (req, res) => {
    const responsibilities = await storage.getIcResponsibilities(req.params.icId);
    res.json(responsibilities);
  });

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

  // -------------------------------------------------------------------------
  // Contract routes
  // -------------------------------------------------------------------------
  app.get("/api/contracts", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const userIdParam = req.query.userId as string | undefined;

    let list;
    if (userIdParam) {
      if (!isAdmin && userIdParam !== currentUser.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (isAdmin && userIdParam !== currentUser.id && currentUser.organizationId) {
        const target = await storage.getUser(userIdParam);
        if (!target || target.organizationId !== currentUser.organizationId) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      list = await storage.getContractsByUser(userIdParam);
    } else {
      if (!isAdmin) {
        list = await storage.getContractsByUser(currentUser.id);
      } else {
        list = await storage.getAllContracts(currentUser.organizationId ?? undefined);
      }
    }
    res.json(list.map((c) => ({ ...c, fileUrl: normalizeFileUrl(c.fileUrl) })));
  });

  app.get("/api/contracts/expiring", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const all = await storage.getAllContracts(currentUser.organizationId ?? undefined);
    const now = Date.now();
    const expiring = all.filter((c) => {
      const end = new Date(c.endDate).getTime();
      const noticeMs = (c.noticePeriodDays || 30) * 24 * 60 * 60 * 1000;
      return end >= now && end - now <= noticeMs;
    });
    res.json(expiring.map((c) => ({ ...c, fileUrl: normalizeFileUrl(c.fileUrl) })));
  });

  app.post("/api/contracts", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const { userId, title, startDate, endDate, noticePeriodDays, fileUrl, fileName } = req.body || {};
      if (!userId || !title || !startDate || !endDate || !fileUrl || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const contractor = await storage.getUser(userId);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      if (currentUser.organizationId && contractor.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      let storedFileUrl = fileUrl as string;
      if (storedFileUrl.startsWith("data:")) {
        const uploaded = await uploadBase64ToObjectStorage(storedFileUrl, fileName);
        if (!uploaded) {
          return res.status(500).json({ error: "Failed to upload contract file" });
        }
        storedFileUrl = uploaded;
      }

      const noticeDaysNum = Number(noticePeriodDays);
      const validNoticeDays = Number.isFinite(noticeDaysNum) && noticeDaysNum > 0 ? Math.floor(noticeDaysNum) : 30;
      const startDateStr = String(startDate);
      const endDateStr = String(endDate);
      if (
        Number.isNaN(new Date(startDateStr).getTime()) ||
        Number.isNaN(new Date(endDateStr).getTime())
      ) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      if (new Date(endDateStr) < new Date(startDateStr)) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      const insertPayload: InsertContract = {
        organizationId: currentUser.organizationId ?? null,
        userId,
        title: String(title),
        startDate: startDateStr,
        endDate: endDateStr,
        noticePeriodDays: validNoticeDays,
        fileUrl: storedFileUrl,
        fileName: String(fileName),
        createdBy: currentUser.id,
      };
      const created = await storage.createContract(insertPayload);

      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: "Contract uploaded",
        details: `Uploaded contract "${title}" for ${contractor.firstName} ${contractor.lastName}`,
        entityType: "contract",
        entityId: created.id,
      });

      res.status(201).json({ ...created, fileUrl: normalizeFileUrl(created.fileUrl) });
    } catch (error: any) {
      console.error("Contract creation error:", error?.message || error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  app.delete("/api/contracts/:id", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const contract = await storage.getContract(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    if (currentUser.organizationId && contract.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const success = await storage.deleteContract(req.params.id);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete contract" });
    }
    await storage.createActivityLog({
      userId: currentUser.id,
      organizationId: currentUser.organizationId,
      action: "Contract deleted",
      details: `Deleted contract "${contract.title}"`,
      entityType: "contract",
      entityId: contract.id,
    });
    res.status(204).send();
  });

  // -------------------------------------------------------------------------
  // Expense reimbursement routes
  // -------------------------------------------------------------------------
  const VALID_EXPENSE_CATEGORIES = new Set<string>(Object.values(ExpenseCategory));

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
  app.post("/api/expenses", authMiddleware, asyncHandler(async (req, res) => {
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

  // Evaluation routes - protected
  app.get("/api/evaluations", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    if (currentUser.role === "ic") {
      const evaluations = await storage.getEvaluationsByIC(currentUser.id);
      return res.json(evaluations);
    }
    
    const { managerId, icId } = req.query;
    if (managerId) {
      const evaluations = await storage.getEvaluationsByManager(managerId as string);
      res.json(evaluations);
    } else if (icId) {
      const evaluations = await storage.getEvaluationsByIC(icId as string);
      res.json(evaluations);
    } else {
      const evaluations = await storage.getAllEvaluations(currentUser.organizationId ?? undefined);
      res.json(evaluations);
    }
  });

  app.get("/api/evaluations/pending-count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    let count = 0;
    
    if (currentUser.role === "ic") {
      // For ICs, count evaluations where they need to complete their self-evaluation
      const evaluations = await storage.getEvaluationsByIC(currentUser.id);
      count = evaluations.filter(e => e.status === "draft").length;
    } else {
      // For managers/admins, count evaluations pending their review
      const evaluations = await storage.getEvaluationsByManager(currentUser.id);
      count = evaluations.filter(e => e.status === "ic_submitted").length;
    }
    
    res.json({ count });
  });

  app.get("/api/evaluations/:id", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    
    if (currentUser.role === "ic" && evaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    res.json(evaluation);
  });

  app.get("/api/evaluations/:id/sections", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    
    if (currentUser.role === "ic" && evaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const sections = await storage.getEvaluationSections(req.params.id);
    res.json(sections);
  });

  app.get("/api/users/:id/last-evaluation", authMiddleware, async (req, res) => {
    const evaluation = await storage.getLastCompletedEvaluation(req.params.id);
    res.json(evaluation || null);
  });

  app.post("/api/evaluations", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    
    // Allow ICs to create self-evaluations (where icId is themselves)
    const isCreatingSelfEvaluation = req.body.icId === currentUser.id;
    
    if (!isSupervisor && !isCreatingSelfEvaluation) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    
    // For self-evaluations, validate that a manager is specified and exists
    if (isCreatingSelfEvaluation) {
      if (!req.body.managerId) {
        return res.status(400).json({ error: "Manager/supervisor is required for self-evaluations" });
      }
      
      // Validate that the manager exists and has supervisor privileges
      const manager = await storage.getUser(req.body.managerId);
      if (!manager) {
        return res.status(400).json({ error: "Selected supervisor does not exist" });
      }
      
      const managerIsSupervisor = await hasSupervisorPrivileges(req.body.managerId);
      if (!managerIsSupervisor && manager.role !== "admin") {
        return res.status(400).json({ error: "Selected user is not a valid supervisor" });
      }
    }
    
    // Build evaluation data with validated fields
    const evaluationData = {
      icId: isCreatingSelfEvaluation ? currentUser.id : req.body.icId,
      managerId: isCreatingSelfEvaluation ? req.body.managerId : (req.body.managerId || currentUser.id),
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
      status: "draft",
      organizationId: currentUser.organizationId,
    };
    
    try {
      const evaluation = await storage.createEvaluation(evaluationData);

      await storage.createDefaultSectionsForEvaluation(evaluation.id);

      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: isCreatingSelfEvaluation ? "Self-evaluation started" : "Evaluation created",
        details: `Created performance evaluation for period ${req.body.periodStart} to ${req.body.periodEnd}`,
        entityType: "evaluation",
        entityId: evaluation.id,
      });

      if (isCreatingSelfEvaluation) {
        // Notify the manager that an IC has started a self-evaluation
        const manager = await storage.getUser(req.body.managerId);
        if (manager) {
          await createNotification(manager.id, {
            type: "evaluation_created",
            title: "Self-Evaluation Started",
            message: `${currentUser.firstName} ${currentUser.lastName} has started a self-evaluation and will submit it for your review.`,
            entityType: "evaluation",
            entityId: evaluation.id,
            actorId: currentUser.id,
          });
        }
      } else {
        // Notify IC that a manager created an evaluation for them
        const ic = await storage.getUser(req.body.icId);
        if (ic) {
          await createNotification(ic.id, {
            type: "evaluation_created",
            title: "New Performance Evaluation",
            message: `A new performance evaluation has been created for you. Please complete your self-assessment.`,
            entityType: "evaluation",
            entityId: evaluation.id,
            actorId: currentUser.id,
          });
        }
      }

      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Error creating evaluation:", error);
      res.status(500).json({ error: "Failed to create evaluation" });
    }
  });

  app.patch("/api/evaluations/:id", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    const existingEvaluation = await storage.getEvaluation(req.params.id);
    if (!existingEvaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    
    if (currentUser.role === "ic" && existingEvaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const updates = { ...req.body };
    
    if (req.body.status === "ic_submitted") {
      updates.icSubmittedAt = new Date();
    } else if (req.body.status === "manager_submitted" || req.body.status === "completed") {
      updates.managerSubmittedAt = new Date();
      if (req.body.status === "completed") {
        updates.completedAt = new Date();
      }
    }

    const evaluation = await storage.updateEvaluation(req.params.id, updates);
    
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }

    if (req.body.status === "ic_submitted") {
      const manager = await storage.getUser(evaluation.managerId);
      const ic = await storage.getUser(evaluation.icId);
      if (manager && ic) {
        await createNotification(manager.id, {
          type: "evaluation_ic_submitted",
          title: "Self-Assessment Submitted",
          message: `${ic.firstName} ${ic.lastName} has submitted their self-assessment. Please review and complete the evaluation.`,
          entityType: "evaluation",
          entityId: evaluation.id,
          actorId: ic.id,
        });
      }
    }

    if (req.body.status === "completed") {
      await storage.createActivityLog({
        userId: evaluation.managerId,
        organizationId: currentUser.organizationId,
        action: "Evaluation completed",
        details: `Completed performance evaluation for period ${evaluation.periodStart} to ${evaluation.periodEnd}`,
        entityType: "evaluation",
        entityId: evaluation.id,
      });

      const ic = await storage.getUser(evaluation.icId);
      const manager = await storage.getUser(evaluation.managerId);
      if (ic && manager) {
        await createNotification(ic.id, {
          type: "evaluation_completed",
          title: "Evaluation Finalized",
          message: `Your performance evaluation has been completed by ${manager.firstName} ${manager.lastName}.`,
          entityType: "evaluation",
          entityId: evaluation.id,
          actorId: manager.id,
        });

        if (evaluation.newExperienceLevel && evaluation.newExperienceLevel !== ic.experienceLevel) {
          await storage.updateUser(ic.id, { experienceLevel: evaluation.newExperienceLevel });
        }
      }
    }

    res.json(evaluation);
  });

  // Evaluation sections routes - protected
  app.patch("/api/evaluation-sections/:id", authMiddleware, async (req, res) => {
    const section = await storage.updateEvaluationSection(req.params.id, req.body);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json(section);
  });

  app.post("/api/evaluations/:id/sections/bulk-update", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    
    if (currentUser.role === "ic" && evaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    try {
      const { sections } = req.body;
      const updatedSections = [];
      
      for (const sectionUpdate of sections) {
        const updated = await storage.updateEvaluationSection(sectionUpdate.id, sectionUpdate);
        if (updated) {
          updatedSections.push(updated);
        }
      }
      
      res.json(updatedSections);
    } catch (error) {
      res.status(500).json({ error: "Failed to update sections" });
    }
  });

  // Finalize evaluation with all data in one call (no save draft required)
  app.post("/api/evaluations/:id/finalize", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    
    const existingEvaluation = await storage.getEvaluation(req.params.id);
    if (!existingEvaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    
    const isIC = currentUser.role === "ic";
    const isManager = await hasSupervisorPrivileges(currentUser.id);
    
    if (isIC && existingEvaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    if (!isIC && !isManager) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    try {
      const { sections, evaluationUpdates, finalizeAs } = req.body;
      
      // Save all sections first
      if (sections && sections.length > 0) {
        for (const sectionUpdate of sections) {
          await storage.updateEvaluationSection(sectionUpdate.id, sectionUpdate);
        }
      }
      
      // Determine new status and timestamps
      const updates: Record<string, any> = { ...evaluationUpdates };
      
      if (finalizeAs === "ic") {
        updates.status = "ic_submitted";
        updates.icSubmittedAt = new Date();
      } else if (finalizeAs === "manager") {
        updates.status = "completed";
        updates.managerSubmittedAt = new Date();
        updates.completedAt = new Date();
        
        // Calculate overall score from section ratings
        const allSections = await storage.getEvaluationSections(req.params.id);
        const managerRatings = allSections
          .map(s => s.managerRating)
          .filter((r): r is number => r !== null && r !== undefined);
        
        if (managerRatings.length > 0) {
          const avgScore = Math.round(managerRatings.reduce((a, b) => a + b, 0) / managerRatings.length);
          updates.overallScore = avgScore;
        }
        
        // Update IC's experience level if newExperienceLevel is set
        if (updates.newExperienceLevel) {
          await storage.updateUser(existingEvaluation.icId, {
            experienceLevel: updates.newExperienceLevel,
          });
        }
      }
      
      const updatedEvaluation = await storage.updateEvaluation(req.params.id, updates);
      
      if (!updatedEvaluation) {
        return res.status(500).json({ error: "Failed to update evaluation" });
      }
      
      // Create notifications
      if (finalizeAs === "ic") {
        const manager = await storage.getUser(existingEvaluation.managerId);
        const ic = await storage.getUser(existingEvaluation.icId);
        if (manager && ic) {
          await createNotification(manager.id, {
            type: "evaluation_ic_submitted",
            title: "Self-Assessment Submitted",
            message: `${ic.firstName} ${ic.lastName} has submitted their self-assessment. Please review and complete the evaluation.`,
            entityType: "evaluation",
            entityId: existingEvaluation.id,
            actorId: ic.id,
          });
        }
      } else if (finalizeAs === "manager") {
        const ic = await storage.getUser(existingEvaluation.icId);
        const manager = await storage.getUser(existingEvaluation.managerId);
        if (ic && manager) {
          await createNotification(ic.id, {
            type: "evaluation_completed",
            title: "Evaluation Completed",
            message: `Your performance evaluation for ${existingEvaluation.periodStart} to ${existingEvaluation.periodEnd} has been completed by ${manager.firstName} ${manager.lastName}.`,
            entityType: "evaluation",
            entityId: existingEvaluation.id,
            actorId: manager.id,
          });
        }
      }
      
      // Create activity log
      try {
        await storage.createActivityLog({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: finalizeAs === "ic" ? "Self-assessment submitted" : "Evaluation completed",
          details: `${finalizeAs === "ic" ? "Submitted self-assessment" : "Finalized evaluation"} for period ${existingEvaluation.periodStart} to ${existingEvaluation.periodEnd}`,
          entityType: "evaluation",
          entityId: existingEvaluation.id,
        });
      } catch (e) {
        console.error("Failed to create activity log:", e);
      }
      
      res.json(updatedEvaluation);
    } catch (error) {
      console.error("Finalization error:", error);
      res.status(500).json({ error: "Failed to finalize evaluation" });
    }
  });

  // Feedback invitation routes - protected
  app.get("/api/feedback-invitations", authMiddleware, async (req, res) => {
    const { evaluationId } = req.query;
    if (evaluationId) {
      const invitations = await storage.getFeedbackInvitationsByEvaluation(evaluationId as string);
      res.json(invitations);
    } else {
      res.json([]);
    }
  });

  app.post("/api/feedback-invitations", authMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers(req.authenticatedUser!.organizationId ?? undefined);
      const invitedUser = users.find(u => u.email === req.body.email);
      
      const invitation = await storage.createFeedbackInvitation({
        ...req.body,
        invitedUserId: invitedUser?.id || "unknown",
        organizationId: req.authenticatedUser!.organizationId,
      });

      try {
        await storage.createActivityLog({
          userId: req.body.invitedById,
          organizationId: req.authenticatedUser!.organizationId,
          action: "Feedback invitation sent",
          details: `Invited ${req.body.email} to provide feedback`,
          entityType: "evaluation",
          entityId: req.body.evaluationId,
        });
      } catch (e) {
        console.error("Failed to create activity log:", e);
      }

      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.patch("/api/feedback-invitations/:id", authMiddleware, async (req, res) => {
    const invitation = await storage.updateFeedbackInvitation(req.params.id, {
      ...req.body,
      completedAt: req.body.status === "completed" ? new Date() : undefined,
    });
    
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    res.json(invitation);
  });

  // Activity logs routes - admin only
  app.get("/api/activity-logs", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const logs = await storage.getActivityLogs(req.authenticatedUser!.organizationId ?? undefined);
    res.json(logs);
  });

  // Notification routes - protected with ownership verification
  app.get("/api/notifications", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, status } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Users can only access their own notifications (admins/cofounders can access any)
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    if (status === "unread") {
      const notifications = await storage.getUnreadNotificationsByUser(userId as string);
      res.json(notifications);
    } else {
      const notifications = await storage.getNotificationsByUser(userId as string);
      res.json(notifications);
    }
  });

  // Path parameter route for notifications (used by frontend queryKey pattern)
  app.get("/api/notifications/count/:userId", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const userId = req.params.userId;
    
    // Users can only access their own notification count
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  });

  app.get("/api/notifications/count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Users can only access their own notification count
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const count = await storage.getUnreadNotificationCount(userId as string);
    res.json({ count });
  });

  // Path parameter route for notifications by userId (used by frontend queryKey pattern)
  app.get("/api/notifications/:userId", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const userId = req.params.userId;
    // Don't match if it looks like a notification ID action
    if (userId === "count" || userId === "read-all") {
      return res.status(404).json({ error: "Not found" });
    }
    
    // Users can only access their own notifications
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const notifications = await storage.getNotificationsByUser(userId);
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const notification = await storage.getNotification(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Users can only mark their own notifications as read
    if (notification.userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const updated = await storage.markNotificationAsRead(req.params.id);
    res.json(updated);
  });

  app.post("/api/notifications/read-all", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Users can only mark their own notifications as read
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  });

  // Notification preferences routes - protected with ownership verification
  app.get("/api/notification-preferences", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Users can only access their own preferences
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    let prefs = await storage.getNotificationPreferences(userId as string);
    if (!prefs) {
      prefs = await storage.createNotificationPreferences({
        userId: userId as string,
        inAppEnabled: true,
        emailEnabled: false,
        oooNotifications: true,
        timesheetNotifications: true,
        overtimeNotifications: true,
        invoiceNotifications: true,
        deadlineReminders: true,
        evaluationNotifications: true,
      });
    }
    res.json(prefs);
  });

  app.patch("/api/notification-preferences", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, ...updates } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Users can only update their own preferences
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    let prefs = await storage.getNotificationPreferences(userId);
    if (!prefs) {
      prefs = await storage.createNotificationPreferences({
        userId,
        inAppEnabled: true,
        emailEnabled: false,
        oooNotifications: true,
        timesheetNotifications: true,
        overtimeNotifications: true,
        invoiceNotifications: true,
        deadlineReminders: true,
        evaluationNotifications: true,
        ...updates,
      });
    } else {
      prefs = await storage.updateNotificationPreferences(userId, updates);
    }
    res.json(prefs);
  });

  app.get("/api/organization", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(404).json({ error: "No organization associated with this user" });
    }
    const org = await storage.getOrganization(currentUser.organizationId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json(org);
  });

  app.patch("/api/organization", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(404).json({ error: "No organization associated with this user" });
    }
    const updated = await storage.updateOrganization(currentUser.organizationId, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json(updated);
  });

  app.get("/api/billing", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(400).json({ error: "User is not associated with an organization" });
    }
    const subscription = await storage.getSubscriptionByOrganization(currentUser.organizationId);
    const organization = await storage.getOrganization(currentUser.organizationId);
    if (!subscription || !organization) {
      return res.status(404).json({ error: "Billing information not found" });
    }
    res.json({
      subscription,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        billingEmail: organization.billingEmail,
      },
    });
  });

  app.get("/api/billing/usage", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(400).json({ error: "User is not associated with an organization" });
    }
    const subscription = await storage.getSubscriptionByOrganization(currentUser.organizationId);
    const currentSeats = await storage.getUserCountByOrganization(currentUser.organizationId);
    const plan = subscription?.plan || "free";
    const maxSeats = subscription?.maxSeats || 3;
    const percentUsed = maxSeats > 0 ? Math.round((currentSeats / maxSeats) * 100) : 0;
    res.json({ currentSeats, maxSeats, plan, percentUsed });
  });

  app.post("/api/billing/change-plan", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { plan } = req.body;
    if (!currentUser.organizationId) {
      return res.status(400).json({ error: "User is not associated with an organization" });
    }
    const { PLAN_LIMITS } = await import("@shared/schema");
    const validPlans = Object.keys(PLAN_LIMITS);
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Must be one of: " + validPlans.join(", ") });
    }
    if (plan === "enterprise") {
      return res.status(400).json({ error: "Please contact sales for Enterprise plan" });
    }
    const subscription = await storage.getSubscriptionByOrganization(currentUser.organizationId);
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    const currentSeats = await storage.getUserCountByOrganization(currentUser.organizationId);
    const newLimits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    if (currentSeats > newLimits.maxSeats) {
      return res.status(400).json({
        error: `Cannot downgrade to ${newLimits.name} plan. You currently have ${currentSeats} users but the plan allows only ${newLimits.maxSeats}. Please remove users first.`,
      });
    }
    const updated = await storage.updateSubscription(subscription.id, {
      plan,
      maxSeats: newLimits.maxSeats,
      updatedAt: new Date(),
    });
    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: "Subscription plan changed",
        details: `Changed plan from ${subscription.plan} to ${plan}`,
        entityType: "subscription",
        entityId: subscription.id,
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }
    res.json(updated);
  });

  // ── SEO / Public content routes ──────────────────────────────────────────
  // These must be registered BEFORE the SPA catch-all in vite.ts / static.ts
  // so that Googlebot receives fully server-rendered HTML.

  const { getBlogIndexHtml, getBlogArticleHtml } = await import("./seo/blogPages");
  const { addSubscriber, isValidEmail } = await import("./seo/emailCapture");
  const { getFaqHtml } = await import("./seo/faqPages");
  const { getArticles: getBlogArticles, createArticle, updateArticle, deleteArticle, BlogNotFoundError, BlogConflictError } = await import("./seo/blogStorage");
  const { FAQ_LAST_UPDATED } = await import("./seo/faqData");
  const { recordView, getAllViewStats } = await import("./seo/blogViews");

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

  // ── Admin Blog API routes (auth-protected, admin only) ─────────────────
  app.get("/api/admin/blog-subscribers", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (_req, res) => {
    const { getSubscribers } = await import("./seo/emailCapture");
    res.json(getSubscribers());
  }));

  app.get("/api/admin/blog", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (_req, res) => {
    res.json(getBlogArticles());
  }));

  app.get("/api/admin/blog-analytics", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (_req, res) => {
    const articles = getBlogArticles();
    const viewStats = getAllViewStats();
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

  app.post("/api/admin/blog", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (req, res) => {
    const validationError = validateBlogArticleBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const { slug, title, metaDescription, publishedDate, updatedDate, readingMinutes, excerpt, bodyHtml } = req.body;
    try {
      const article = createArticle({ slug, title, metaDescription, publishedDate, updatedDate, readingMinutes: Number(readingMinutes), excerpt, bodyHtml });
      res.status(201).json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.put("/api/admin/blog/:slug", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (req, res) => {
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
      const article = updateArticle(req.params.slug, updates);
      res.json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.delete("/api/admin/blog/:slug", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (req, res) => {
    try {
      deleteArticle(req.params.slug);
      res.json({ success: true });
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.post("/api/blog/subscribe", (req, res) => {
    const email = (req.body?.email ?? "").toString().trim();
    const rawReturnTo = (req.body?.returnTo ?? "/blog").toString().trim();
    const returnTo = /^\/blog(\/[a-z0-9-]*)?$/.test(rawReturnTo) ? rawReturnTo : "/blog";

    if (!email || !isValidEmail(email)) {
      const opts = { error: "Please enter a valid email address." };
      const html = returnTo.startsWith("/blog/")
        ? getBlogArticleHtml(returnTo.replace("/blog/", ""), opts)
        : getBlogIndexHtml(opts);
      if (!html) {
        res.redirect(`${returnTo}?error=invalid`);
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(html);
      return;
    }

    addSubscriber(email, returnTo);
    res.redirect(`${returnTo}?subscribed=1`);
  });

  app.get("/blog", (req, res) => {
    const subscribed = req.query.subscribed === "1";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", subscribed ? "no-store" : BLOG_CACHE);
    res.send(getBlogIndexHtml({ subscribed }));
  });

  app.get("/blog/:slug", (req, res) => {
    const subscribed = req.query.subscribed === "1";
    const html = getBlogArticleHtml(req.params.slug, { subscribed });
    if (!html) {
      res.status(404).send("<h1>Article not found</h1>");
      return;
    }
    if (!subscribed) {
      recordView(req.params.slug, req.headers.referer);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", subscribed ? "no-store" : BLOG_CACHE);
    res.send(html);
  });

  app.get("/faq", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(getFaqHtml());
  });

  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(
      `User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml\nSitemap: /sitemap-blog.xml\n`
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

  app.get("/sitemap.xml", (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const articles = getBlogArticles();
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
    const xml = buildSitemapXml([
      { loc: `${BASE_URL}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
      { loc: `${BASE_URL}/blog`, lastmod: mostRecentArticleDate, changefreq: "weekly", priority: "0.9" },
      { loc: `${BASE_URL}/faq`, lastmod: FAQ_LAST_UPDATED, changefreq: "monthly", priority: "0.8" },
      { loc: `${BASE_URL}/signup`, lastmod: today, changefreq: "monthly", priority: "0.8" },
      ...articleUrls,
    ]);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SEO_CACHE);
    res.send(xml);
  });

  app.get("/sitemap-blog.xml", (_req, res) => {
    const articles = getBlogArticles();
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
  });

  return httpServer;
}
