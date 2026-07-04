import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, comparePassword } from "./storage";
import { db } from "./db";
import { parseBulkBody, runBulk } from "./bulkReview";
import { eq } from "drizzle-orm";
import {
  timesheets as timesheetsTable,
  oooRequests as oooRequestsTable,
  overtimeRequests as overtimeRequestsTable,
  expenses as expensesTable,
  invoices as invoicesTable,
  activityLogs as activityLogsTable,
} from "@shared/schema";
import { createSession, invalidateSession, getUserIdFromToken } from "./sessionManager";
import type { User, UserRoleType, InsertContract, InsertExpense } from "@shared/schema";
import { ExpenseCategory } from "@shared/schema";

import { ObjectStorageService, registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { createMigrateFilesRouter } from "./migrate-files";
import { randomUUID, randomBytes } from "crypto";
import { sendPasswordResetEmail } from "./emailService";

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

// Rate limiting state — keyed on account+IP so brute-forcing one account
// doesn't get a shared budget with every other user behind the same NAT/proxy
// IP, while still bounding attempts against any single account.
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_MAX_ENTRIES = 50000; // bound memory; evict oldest entries beyond this

function pruneRateLimitMap(now: number) {
  if (loginAttempts.size <= RATE_LIMIT_MAX_ENTRIES) return;
  loginAttempts.forEach((attempts, key) => {
    if (now - attempts.lastAttempt > RATE_LIMIT_WINDOW) {
      loginAttempts.delete(key);
    }
  });
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  pruneRateLimitMap(now);
  const attempts = loginAttempts.get(key);

  if (!attempts || (now - attempts.lastAttempt) > RATE_LIMIT_WINDOW) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return true;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
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

// Platform-admin guard: only users whose email is listed in the
// PLATFORM_ADMIN_EMAILS environment variable (comma-separated) may access
// global content such as the blog and SEO pages.
function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.authenticatedUser;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Forbidden - Platform admin access required" });
  }
  next();
}

function checkOrgBoundary(currentUser: User, targetUser: { organizationId: string | null }): boolean {
  // No bypass for a null organizationId — an org-less caller must not be able
  // to reach real (org-scoped) records. Every real organization gets a
  // generated UUID, so this only ever matches another org-less record.
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
  notifyTimesheetUnlocked,
  notifyInvoicePaid,
  notifyFeedbackRequested,
  notifyEvaluationOutcome,
  createNotification,
} from "./notificationService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Object Storage routes for serving uploaded files
  registerObjectStorageRoutes(app, authMiddleware, storage);

  // Migration file upload route - admin only
  app.use(createMigrateFilesRouter(authMiddleware, requireRole("admin")));

  // Auth routes (no auth middleware - public endpoints)
  app.post("/api/auth/login", async (req, res) => {
    // req.ip honors X-Forwarded-For once "trust proxy" is set (index.ts),
    // so this resolves to the real client address behind Replit's proxy
    // rather than the proxy's own socket address for every request.
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Key on account+IP: bounds attempts against any one account without
    // letting one abusive account exhaust the budget for everyone sharing
    // that IP (NAT/office network), and vice versa.
    const rateLimitKey = `${username.toLowerCase()}:${clientIp}`;
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ error: "Too many login attempts. Please wait 1 minute." });
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
    resetRateLimit(rateLimitKey);

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
    // Public, unauthenticated signup — throttle per IP to slow down
    // automated org/account creation abuse.
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkRateLimit(`register:${clientIp}`)) {
      return res.status(429).json({ error: "Too many signup attempts. Please wait a minute and try again." });
    }

    const { firstName, lastName, email, password, organizationName } = req.body;

    if (!firstName || !lastName || !email || !password || !organizationName) {
      return res.status(400).json({ error: "All fields are required: firstName, lastName, email, password, organizationName" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
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

  const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

  app.post("/api/auth/forgot-password", async (req, res) => {
    // Throttle per IP — this endpoint must not become an email-bombing or
    // account-enumeration vector.
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkRateLimit(`forgot-password:${clientIp}`)) {
      return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Always respond with the same generic message whether or not the email
    // exists — a different response would let an attacker enumerate accounts.
    const genericResponse = { message: "If an account with that email exists, we've sent a password reset link." };

    const user = await storage.getUserByEmail(email);
    if (!user || !user.isActive) {
      return res.json(genericResponse);
    }

    try {
      const token = randomBytes(32).toString("base64url");
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      });

      const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (e) {
      console.error("Failed to create/send password reset token:", e);
    }

    res.json(genericResponse);
  });

  app.post("/api/auth/reset-password", asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "token and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    }

    await storage.updateUser(resetToken.userId, { password: newPassword, mustChangePassword: false });
    await storage.markPasswordResetTokenUsed(resetToken.id);

    try {
      const user = await storage.getUser(resetToken.userId);
      await storage.createActivityLog({
        userId: resetToken.userId,
        organizationId: user?.organizationId ?? null,
        action: "Password reset via email link",
        details: "User completed a self-service password reset",
        entityType: "user",
        entityId: resetToken.userId,
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    res.json({ message: "Password has been reset. You can now log in." });
  }));

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
    // Only expose display fields — never compensation/rate data — to any authenticated user.
    const basicManagers = managers.map(({ id, firstName, lastName, jobTitle, role }) => ({ id, firstName, lastName, jobTitle, role }));
    res.json(basicManagers);
  }));

  app.get("/api/users/supervisors", authMiddleware, asyncHandler(async (req, res) => {
    const supervisors = await storage.getSupervisors(req.authenticatedUser!.organizationId ?? undefined);
    // Only expose display fields — never compensation/rate data — to any authenticated user.
    const basicSupervisors = supervisors.map(({ id, firstName, lastName, jobTitle, role }) => ({ id, firstName, lastName, jobTitle, role }));
    res.json(basicSupervisors);
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
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (!isAdmin && supervisorId !== currentUser.id) {
        return res.status(403).json({ error: "Forbidden - Cannot view another supervisor's team" });
      }
      const supervisorUser = await storage.getUser(supervisorId as string);
      if (!supervisorUser || !checkOrgBoundary(currentUser, supervisorUser)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
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

      // Allowlist permitted fields — prevent privilege injection via req.body.
      // (`phone`/`startDate` are intentionally not accepted here: neither is
      // a column on the users table, so they were previously silently dropped.)
      const {
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
        currency,
        role: requestedRole,
        isActive: requestedIsActive,
        organizationId: requestedOrgId,
      } = req.body;

      // Only owners can set a role; everyone else's created users are always "ic".
      // (The previous ternary's else-branch fell through to `requestedRole || "ic"`,
      // which let a non-owner admin set any role by simply supplying one.)
      const role = currentUser.role === "owner" ? (requestedRole || "ic") : "ic";

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
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
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
      if (role !== undefined) {
        // Only an owner may grant the owner role — an admin could otherwise
        // escalate themselves or another admin to owner.
        if (role === "owner" && currentUser.role !== "owner") {
          return res.status(403).json({ error: "Only an owner can assign the owner role" });
        }
        allowedUpdates.role = role;
      }
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
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // If currentPassword is provided (voluntary change via profile), verify it
    if (currentPassword) {
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

  app.delete("/api/users/:id", authMiddleware, requireRole("admin", "owner"), asyncHandler(async (req, res) => {
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!checkOrgBoundary(req.authenticatedUser!, targetUser)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    // Hard-deleting a user with any historical records would violate foreign
    // key constraints (timesheets/invoices/OOO/overtime/evaluations are not
    // cascaded) and crash with a raw 500. Detect this up front and point the
    // admin at Suspend instead, which is the safe path for users with history.
    const [timesheets, invoices, oooReqs, overtimeReqs, evalsAsIC, evalsAsManager] = await Promise.all([
      storage.getTimesheetsByUser(req.params.id),
      storage.getInvoicesByUser(req.params.id),
      storage.getOOORequestsByUser(req.params.id),
      storage.getOvertimeRequestsByUser(req.params.id),
      storage.getEvaluationsByIC(req.params.id),
      storage.getEvaluationsByManager(req.params.id),
    ]);
    const hasHistory = timesheets.length > 0 || invoices.length > 0 || oooReqs.length > 0 ||
      overtimeReqs.length > 0 || evalsAsIC.length > 0 || evalsAsManager.length > 0;
    if (hasHistory) {
      return res.status(409).json({
        error: "This user has existing timesheets, invoices, leave requests, or evaluations and cannot be permanently deleted. Suspend the account instead to block their access.",
      });
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
  }));

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
            supervisorId,
            managerId,
            hourlyRate,
            monthlyCap,
            currency,
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

    // crypto.randomBytes, not Math.random, for the temp password — and
    // actually return it, since the admin has no other way to deliver it
    // (the previous version generated a password the admin could never see).
    const tempPassword = randomBytes(9).toString("base64url");
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

  app.patch("/api/ooo-requests/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingRequest = await storage.getOOORequest(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (!checkOrgBoundary(currentUser, existingRequest)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    const isOwner = currentUser.id === existingRequest.userId;
    const requestedStatus = req.body.status;
    const isReviewAction = requestedStatus === "approved" || requestedStatus === "rejected";

    if (isReviewAction) {
      // Manager/admin review path — reviewer identity and allowed fields are
      // always server-derived, never trusted from the request body.
      if (isOwner) {
        return res.status(403).json({ error: "You cannot approve or reject your own request" });
      }
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (!isAdmin) {
        const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
        if (!isSupervisor) {
          return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
        }
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(existingRequest.userId)) {
          return res.status(403).json({ error: "Not authorized to review this request" });
        }
      }
      if (existingRequest.status !== "pending") {
        return res.status(400).json({ error: `Request is ${existingRequest.status}, not pending` });
      }

      const { reviewNote } = req.body;
      const request = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(oooRequestsTable)
          .set({
            status: requestedStatus,
            reviewedBy: currentUser.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          })
          .where(eq(oooRequestsTable.id, req.params.id))
          .returning();
        if (!row) throw new Error("Failed to update request");
        await tx.insert(activityLogsTable).values({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: `OOO request ${requestedStatus}`,
          details: `Leave request was ${requestedStatus}`,
          entityType: "ooo_request",
          entityId: req.params.id,
        });
        return row;
      });

      try {
        if (requestedStatus === "approved") {
          await notifyOOOApproved(request, currentUser);
        } else {
          await notifyOOORejected(request, currentUser, reviewNote ?? undefined);
        }
      } catch (e) {
        console.error("Notification failed:", e);
      }

      return res.json(request);
    }

    // Self-edit path — the owner editing their own request while it's still pending.
    if (!isOwner) {
      return res.status(403).json({ error: "Cannot edit another user's request" });
    }
    if (existingRequest.status !== "pending") {
      return res.status(403).json({ error: "Cannot edit a request that has already been reviewed" });
    }

    const { startDate, endDate, managerId, oooType, reason } = req.body;
    const request = await storage.updateOOORequest(req.params.id, {
      startDate,
      endDate,
      managerId,
      oooType,
      reason,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });
    if (!request) {
      return res.status(500).json({ error: "Failed to update request" });
    }

    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: "OOO request updated",
        details: `Updated leave request for ${request.startDate} to ${request.endDate}`,
        entityType: "ooo_request",
        entityId: request.id,
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    res.json(request);
  }));

  // Timesheet routes
  app.get("/api/timesheets", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, month, year } = req.query;

    if (userId) {
      const isSelf = userId === currentUser.id;
      if (!isSelf) {
        const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
        if (isAdmin) {
          const targetUser = await storage.getUser(userId as string);
          if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
            return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
          }
        } else {
          const teamMemberIds = await getTeamMemberIds(currentUser.id);
          if (!teamMemberIds.includes(userId as string)) {
            return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
          }
        }
      }

      if (month && year) {
        const monthInt = parseInt(month as string);
        const yearInt = parseInt(year as string);
        if (isNaN(monthInt) || isNaN(yearInt)) {
          return res.status(400).json({ error: "month and year must be numbers" });
        }
        const timesheet = await storage.getTimesheetByUserAndMonth(userId as string, monthInt, yearInt);
        return res.json(timesheet || null);
      }
      const timesheets = await storage.getTimesheetsByUser(userId as string);
      return res.json(timesheets);
    }

    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    let timesheets = await storage.getAllTimesheets(currentUser.organizationId ?? undefined);
    if (currentUser.role !== "admin" && currentUser.role !== "owner") {
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
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
  }));

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

  app.get("/api/timesheets/:id/entries", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const timesheet = await storage.getTimesheet(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }
    const isSelf = timesheet.userId === currentUser.id;
    if (!isSelf) {
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (isAdmin) {
        if (!checkOrgBoundary(currentUser, timesheet)) {
          return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
        }
      } else {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(timesheet.userId)) {
          return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
        }
      }
    }
    const entries = await storage.getDailyEntriesByTimesheet(req.params.id);
    res.json(entries);
  }));

  app.post("/api/timesheets/save", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { month, year, entries } = req.body;
    const userId = currentUser.id;

    if (month === undefined || year === undefined || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Required fields missing: month, year, entries" });
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
    const currentUser = req.authenticatedUser!;
    const { month, year, entries } = req.body;
    const userId = currentUser.id;

    if (month === undefined || year === undefined || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Required fields missing: month, year, entries" });
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

    const { status, reviewNote } = req.body;
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    if (!checkOrgBoundary(currentUser, existingTimesheet)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    if (currentUser.id === existingTimesheet.userId) {
      return res.status(403).json({ error: "You cannot approve or reject your own timesheet" });
    }

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isAdmin) {
      const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
      if (!isSupervisor) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(existingTimesheet.userId)) {
        return res.status(403).json({ error: "Not authorized to review this timesheet" });
      }
    }

    if (existingTimesheet.status !== "submitted") {
      return res.status(400).json({ error: `Timesheet is ${existingTimesheet.status}, not submitted` });
    }

    const timesheet = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(timesheetsTable)
        .set({
          status,
          reviewedBy: currentUser.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
        })
        .where(eq(timesheetsTable.id, req.params.id))
        .returning();
      if (!row) throw new Error("Failed to update timesheet");
      await tx.insert(activityLogsTable).values({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `Timesheet ${status}`,
        details: `Timesheet for ${existingTimesheet.month}/${existingTimesheet.year} was ${status}${reviewNote ? `: ${reviewNote}` : ""}`,
        entityType: "timesheet",
        entityId: req.params.id,
      });
      return row;
    });

    try {
      if (status === "approved") {
        await notifyTimesheetApproved(timesheet, existingTimesheet.userId, currentUser);
      } else {
        await notifyTimesheetRejected(timesheet, existingTimesheet.userId, currentUser, reviewNote ?? undefined);
      }
    } catch (e) {
      console.error("Notification failed:", e);
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

  // Overtime request routes - protected
  app.get("/api/overtime-requests", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, timesheetId, status } = req.query;

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    let requests: Awaited<ReturnType<typeof storage.getAllOvertimeRequests>> = [];

    if (userId) {
      const isSelf = userId === currentUser.id;
      if (!isSelf) {
        if (isAdmin) {
          const targetUser = await storage.getUser(userId as string);
          if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
            return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
          }
        } else {
          const teamMemberIds = await getTeamMemberIds(currentUser.id);
          if (!teamMemberIds.includes(userId as string)) {
            return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
          }
        }
      }
      requests = await storage.getOvertimeRequestsByUser(userId as string);
    } else if (timesheetId) {
      const timesheet = await storage.getTimesheet(timesheetId as string);
      if (!timesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      const isSelf = timesheet.userId === currentUser.id;
      if (!isSelf) {
        if (isAdmin) {
          if (!checkOrgBoundary(currentUser, timesheet)) {
            return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
          }
        } else {
          const teamMemberIds = await getTeamMemberIds(currentUser.id);
          if (!teamMemberIds.includes(timesheet.userId)) {
            return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
          }
        }
      }
      requests = await storage.getOvertimeRequestsByTimesheet(timesheetId as string);
    } else {
      const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
      if (!isSupervisor) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
      requests = status === "pending"
        ? await storage.getPendingOvertimeRequests(currentUser.organizationId ?? undefined)
        : await storage.getAllOvertimeRequests(currentUser.organizationId ?? undefined);
      if (!isAdmin) {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        requests = requests.filter(r => teamMemberIds.includes(r.userId));
      }
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
  }));

  app.get("/api/overtime-requests/pending-count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const requests = await storage.getPendingOvertimeRequests(req.authenticatedUser!.organizationId ?? undefined);
    res.json({ count: requests.length });
  });

  app.post("/api/overtime-requests", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { timesheetId, date, requestedHours, isWeekendWork } = req.body;

    const timesheet = await storage.getTimesheet(timesheetId);
    if (!timesheet || timesheet.userId !== currentUser.id) {
      return res.status(403).json({ error: "Can only create overtime requests for your own timesheet" });
    }

    try {
      // Check for existing overtime request to prevent duplicates
      const existingRequest = await storage.getOvertimeRequestByTimesheetAndDate(timesheetId, date);
      if (existingRequest) {
        // Return existing request instead of creating a duplicate
        return res.json(existingRequest);
      }

      const request = await storage.createOvertimeRequest({
        userId: currentUser.id,
        timesheetId,
        date,
        requestedHours,
        isWeekendWork,
        status: "pending",
        organizationId: currentUser.organizationId,
      });

      try {
        await storage.createActivityLog({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: "Overtime request created",
          details: `Requested ${requestedHours - 8} overtime hours for ${date}`,
          entityType: "overtime_request",
          entityId: request.id,
        });

        await notifyOvertimeSubmitted(request, currentUser);
      } catch (e) {
        console.error("Failed to create activity log or notification:", e);
      }

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create overtime request" });
    }
  }));

  app.patch("/api/overtime-requests/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingRequest = await storage.getOvertimeRequest(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const { status, reviewNote } = req.body;
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    if (!checkOrgBoundary(currentUser, existingRequest)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    if (currentUser.id === existingRequest.userId) {
      return res.status(403).json({ error: "You cannot approve or reject your own overtime request" });
    }

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isAdmin) {
      const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
      if (!isSupervisor) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(existingRequest.userId)) {
        return res.status(403).json({ error: "Not authorized to review this request" });
      }
    }

    if (existingRequest.status !== "pending") {
      return res.status(400).json({ error: `Request has already been ${existingRequest.status}` });
    }

    // Validate approvedHours if provided (supports partial approval)
    let approvedHours = existingRequest.requestedHours;
    if (status === "approved" && req.body.approvedHours !== undefined) {
      approvedHours = Number(req.body.approvedHours);
      if (isNaN(approvedHours) || approvedHours < 1 || approvedHours > existingRequest.requestedHours) {
        return res.status(400).json({
          error: `Approved hours must be between 1 and ${existingRequest.requestedHours}`
        });
      }
    }

    const updates: Record<string, any> = {
      status,
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    };
    if (status === "approved") {
      updates.approvedHours = approvedHours;
    }

    const request = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(overtimeRequestsTable)
        .set(updates)
        .where(eq(overtimeRequestsTable.id, req.params.id))
        .returning();
      if (!row) throw new Error("Failed to update overtime request");
      await tx.insert(activityLogsTable).values({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `Overtime request ${status}`,
        details: `Overtime request was ${status}${reviewNote ? `: ${reviewNote}` : ""}`,
        entityType: "overtime_request",
        entityId: req.params.id,
      });
      return row;
    });

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
      if (status === "approved") {
        await notifyOvertimeApproved(request, currentUser);
      } else {
        await notifyOvertimeRejected(request, currentUser, reviewNote ?? undefined);
      }
    } catch (e) {
      console.error("Notification failed:", e);
    }

    res.json(request);
  }));

  // Get approved OOO dates for a user within a month
  app.get("/api/ooo-requests/approved-dates", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { userId, month, year } = req.query;
    if (!userId || !month || !year) {
      return res.status(400).json({ error: "userId, month, and year are required" });
    }

    const isSelf = userId === currentUser.id;
    if (!isSelf) {
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (isAdmin) {
        const targetUser = await storage.getUser(userId as string);
        if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
          return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
        }
      } else {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(userId as string)) {
          return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
        }
      }
    }

    const monthInt = parseInt(month as string);
    const yearInt = parseInt(year as string);
    if (isNaN(monthInt) || isNaN(yearInt)) {
      return res.status(400).json({ error: "month and year must be numbers" });
    }

    const requests = await storage.getOOORequestsByUser(userId as string);
    const approvedRequests = requests.filter(r => r.status === "approved");

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
  }));

  // Invoice routes - protected
  app.get("/api/invoices", authMiddleware, async (req, res) => {
    const { userId } = req.query;
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    let invoices;
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
      invoices = await storage.getInvoicesByUser(targetUserId);
    } else {
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
      invoices = await storage.getAllInvoices(currentUser.organizationId ?? undefined);
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
      const currentUser = req.authenticatedUser!;
      const { month, year } = req.body;
      const userId = currentUser.id;

      // Reject a second invoice for a period that already has a live one —
      // the DB has a matching unique index as a backstop against races.
      const existingForPeriod = await storage.getInvoicesByUser(userId);
      const duplicate = existingForPeriod.find(inv => inv.month === month && inv.year === year);
      if (duplicate) {
        return res.status(400).json({ error: "An invoice for this period already exists. Delete it before uploading a new one." });
      }

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
        userId,
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
        userId,
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

  app.get("/api/invoices/next-number/:userId", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (currentUser.id !== req.params.userId) {
      return res.status(403).json({ error: "Can only generate an invoice number for yourself" });
    }
    try {
      const invoiceNumber = await storage.getNextInvoiceNumber(req.params.userId);
      res.json({ invoiceNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next invoice number" });
    }
  }));

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
  app.patch("/api/invoices/:id", authMiddleware, asyncHandler(async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const user = req.authenticatedUser!;
    const { status, reviewNote } = req.body;

    if (status !== "approved" && status !== "rejected" && status !== "revision_requested") {
      return res.status(400).json({ error: "status must be 'approved', 'rejected', or 'revision_requested'" });
    }

    if (!checkOrgBoundary(user, invoice)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    // Prevent self-approval
    if (user.id === invoice.userId) {
      return res.status(403).json({ error: "You cannot approve or reject your own invoice" });
    }

    // Check if user has supervisor privileges, and that this invoice's owner is on their team
    const isAdmin = user.role === "admin" || user.role === "owner";
    const isSupervisor = await hasSupervisorPrivileges(user.id);
    if (!isSupervisor) {
      return res.status(403).json({ error: "Insufficient permissions to review invoices" });
    }
    if (!isAdmin) {
      const teamMemberIds = await getTeamMemberIds(user.id);
      if (!teamMemberIds.includes(invoice.userId)) {
        return res.status(403).json({ error: "Not authorized to review this invoice" });
      }
    }

    // Prevent re-reviewing approved invoices
    if (invoice.status === "approved") {
      return res.status(400).json({ error: "This invoice has already been approved and cannot be changed" });
    }
    // Prevent reviewing paid invoices via this route
    if (invoice.status === "paid") {
      return res.status(400).json({ error: "This invoice has been paid and cannot be changed" });
    }

    const updatedInvoice = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(invoicesTable)
        .set({
          status,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
        })
        .where(eq(invoicesTable.id, req.params.id))
        .returning();
      if (!row) throw new Error("Failed to update invoice");
      await tx.insert(activityLogsTable).values({
        userId: user.id,
        organizationId: user.organizationId,
        action: status === "approved" ? "Invoice approved" : status === "rejected" ? "Invoice rejected" : "Invoice revision requested",
        details: `${status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Requested revision for"} invoice ${invoice.invoiceNumber}${reviewNote ? `: ${reviewNote}` : ""}`,
        entityType: "invoice",
        entityId: req.params.id,
      });
      return row;
    });

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
    }

    // Handle revision request
    if (status === "revision_requested") {
      await notifyInvoiceRevisionRequested(updatedInvoice, invoice.userId, user, reviewNote);
    }

    res.json({
      ...updatedInvoice,
      fileUrl: normalizeFileUrl(updatedInvoice.fileUrl),
    });
  }));

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
  app.get("/api/invoices/:invoiceId/line-items", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const invoice = await storage.getInvoice(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isOwner = currentUser.id === invoice.userId;
    if (isAdmin) {
      if (!checkOrgBoundary(currentUser, invoice)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    } else if (!isOwner) {
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(invoice.userId)) {
        return res.status(403).json({ error: "Forbidden - Cannot access this invoice" });
      }
    }
    const lineItems = await storage.getInvoiceLineItems(req.params.invoiceId);
    res.json(lineItems);
  }));

  app.post("/api/invoices/:invoiceId/line-items", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const invoice = await storage.getInvoice(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.userId !== currentUser.id) {
      return res.status(403).json({ error: "Only the invoice owner can add line items" });
    }
    if (invoice.status !== "pending_review" && invoice.status !== "revision_requested") {
      return res.status(403).json({ error: "Cannot modify line items on a reviewed invoice" });
    }
    const { description, rate, quantity, total, sortOrder } = req.body;
    try {
      const lineItem = await storage.createInvoiceLineItem({
        description,
        rate,
        quantity,
        total,
        sortOrder,
        invoiceId: req.params.invoiceId,
        organizationId: currentUser.organizationId,
      });
      res.status(201).json(lineItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create line item" });
    }
  }));

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

  app.post("/api/ic-payment-details", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.body.userId;
    if (currentUser.id !== targetUserId) {
      return res.status(403).json({ error: "Can only manage your own payment details" });
    }
    const { bankName, accountHolderFirstName, accountHolderLastName, accountNumber, routingNumber, swiftCode, ibanNumber, accountType, address } = req.body;
    const payload = {
      bankName, accountHolderFirstName, accountHolderLastName, accountNumber,
      routingNumber, swiftCode, ibanNumber, accountType, address,
      userId: targetUserId,
      organizationId: currentUser.organizationId,
    };
    try {
      const existing = await storage.getIcPaymentDetails(targetUserId);
      if (existing) {
        const updated = await storage.updateIcPaymentDetails(targetUserId, payload);
        return res.json(updated);
      }
      const details = await storage.createIcPaymentDetails(payload);
      res.status(201).json(details);
    } catch (error) {
      res.status(500).json({ error: "Failed to save payment details" });
    }
  }));

  app.patch("/api/ic-payment-details/:userId", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (currentUser.id !== req.params.userId) {
      return res.status(403).json({ error: "Can only manage your own payment details" });
    }
    const { bankName, accountHolderFirstName, accountHolderLastName, accountNumber, routingNumber, swiftCode, ibanNumber, accountType, address } = req.body;
    const details = await storage.updateIcPaymentDetails(req.params.userId, {
      bankName, accountHolderFirstName, accountHolderLastName, accountNumber,
      routingNumber, swiftCode, ibanNumber, accountType, address,
    });
    if (!details) {
      return res.status(404).json({ error: "Payment details not found" });
    }
    res.json(details);
  }));

  // IC Responsibilities routes - protected
  app.get("/api/ic-responsibilities/:icId", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const icId = req.params.icId;
    const isSelf = currentUser.id === icId;
    if (!isSelf) {
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (isAdmin) {
        const targetUser = await storage.getUser(icId);
        if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
          return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
        }
      } else {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(icId)) {
          return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
        }
      }
    }
    const responsibilities = await storage.getIcResponsibilities(icId);
    res.json(responsibilities);
  }));

  app.post("/api/ic-responsibilities", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { icId, responsibility, isActive } = req.body;
    if (!icId || !responsibility) {
      return res.status(400).json({ error: "icId and responsibility are required" });
    }
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (isAdmin) {
      const targetUser = await storage.getUser(icId);
      if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    } else {
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(icId)) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
    }
    try {
      const created = await storage.createIcResponsibility({
        icId,
        responsibility,
        isActive: isActive !== undefined ? isActive : true,
        organizationId: currentUser.organizationId,
      });
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to create responsibility" });
    }
  }));

  app.patch("/api/ic-responsibilities/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existing = await storage.getIcResponsibility(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Responsibility not found" });
    }
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (isAdmin) {
      if (!checkOrgBoundary(currentUser, existing)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    } else {
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(existing.icId)) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
    }
    const { responsibility, isActive } = req.body;
    const updates: Record<string, any> = {};
    if (responsibility !== undefined) updates.responsibility = responsibility;
    if (isActive !== undefined) updates.isActive = isActive;
    const updated = await storage.updateIcResponsibility(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Responsibility not found" });
    }
    res.json(updated);
  }));

  app.delete("/api/ic-responsibilities/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existing = await storage.getIcResponsibility(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Responsibility not found" });
    }
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (isAdmin) {
      if (!checkOrgBoundary(currentUser, existing)) {
        return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
      }
    } else {
      const teamMemberIds = await getTeamMemberIds(currentUser.id);
      if (!teamMemberIds.includes(existing.icId)) {
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }
    }
    const success = await storage.deleteIcResponsibility(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Responsibility not found" });
    }
    res.status(204).send();
  }));

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
  app.get("/api/evaluations", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    if (isAdmin) {
      const evaluations = await storage.getAllEvaluations(currentUser.organizationId ?? undefined);
      return res.json(evaluations);
    }

    // Non-admins see evaluations where they are the IC being evaluated OR the
    // assigned manager/reviewer — an IC with direct reports is still role
    // "ic" but must still see the evaluations they're reviewing as manager.
    const [asIC, asManager] = await Promise.all([
      storage.getEvaluationsByIC(currentUser.id),
      storage.getEvaluationsByManager(currentUser.id),
    ]);
    const merged = new Map<string, typeof asIC[number]>();
    for (const e of [...asIC, ...asManager]) merged.set(e.id, e);
    res.json(Array.from(merged.values()));
  }));

  app.get("/api/evaluations/pending-count", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const [asIC, asManager] = await Promise.all([
      storage.getEvaluationsByIC(currentUser.id),
      storage.getEvaluationsByManager(currentUser.id),
    ]);
    const ownDraftCount = asIC.filter(e => e.status === "draft").length;
    const pendingReviewCount = asManager.filter(e => e.status === "ic_submitted").length;
    res.json({ count: ownDraftCount + pendingReviewCount });
  }));

  app.get("/api/evaluations/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;

    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isParticipant = currentUser.id === evaluation.icId || currentUser.id === evaluation.managerId;
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!checkOrgBoundary(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    res.json(evaluation);
  }));

  app.get("/api/evaluations/:id/sections", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;

    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }

    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isParticipant = currentUser.id === evaluation.icId || currentUser.id === evaluation.managerId;
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!checkOrgBoundary(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    const sections = await storage.getEvaluationSections(req.params.id);
    res.json(sections);
  }));

  app.get("/api/users/:id/last-evaluation", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    const isSelf = currentUser.id === targetUserId;
    if (!isSelf) {
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      if (isAdmin) {
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
          return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
        }
      } else {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(targetUserId)) {
          return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
        }
      }
    }
    const evaluation = await storage.getLastCompletedEvaluation(targetUserId);
    res.json(evaluation || null);
  }));

  app.post("/api/evaluations", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);

    // Allow ICs to create self-evaluations (where icId is themselves)
    const isCreatingSelfEvaluation = req.body.icId === currentUser.id;

    if (!isSupervisor && !isCreatingSelfEvaluation) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    if (!isCreatingSelfEvaluation) {
      const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
      const targetIc = await storage.getUser(req.body.icId);
      if (!targetIc) {
        return res.status(400).json({ error: "IC not found" });
      }
      if (isAdmin) {
        if (!checkOrgBoundary(currentUser, targetIc)) {
          return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
        }
      } else {
        const teamMemberIds = await getTeamMemberIds(currentUser.id);
        if (!teamMemberIds.includes(req.body.icId)) {
          return res.status(403).json({ error: "Forbidden - Can only create evaluations for your direct reports" });
        }
      }
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
  }));

  app.patch("/api/evaluations/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;

    const existingEvaluation = await storage.getEvaluation(req.params.id);
    if (!existingEvaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }

    if (!checkOrgBoundary(currentUser, existingEvaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    // Ownership is based on who the evaluation actually assigns as IC/manager,
    // never on the caller's stored `role` — an IC with direct reports is still
    // role "ic" but must be able to act as manager on evaluations they own.
    const isICOwner = currentUser.id === existingEvaluation.icId;
    const isManagerOwner = currentUser.id === existingEvaluation.managerId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    if (!isICOwner && !isManagerOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: Record<string, any> = {};
    const requestedStatus = req.body.status;

    if (requestedStatus === "ic_submitted") {
      if (!isICOwner) {
        return res.status(403).json({ error: "Only the evaluation owner can submit their self-assessment" });
      }
      if (existingEvaluation.status !== "draft") {
        return res.status(400).json({ error: `Evaluation is ${existingEvaluation.status}, not draft` });
      }
      updates.status = "ic_submitted";
      updates.icSubmittedAt = new Date();
    } else if (requestedStatus === "manager_submitted" || requestedStatus === "completed") {
      // Manager-side fields — including newExperienceLevel and outcomes — can
      // ONLY be set by the assigned manager or an org admin, never by the IC
      // being evaluated. This is the boundary that prevents self-promotion.
      if (!isManagerOwner && !isAdmin) {
        return res.status(403).json({ error: "Only the assigned manager can complete this evaluation" });
      }
      if (existingEvaluation.status !== "ic_submitted" && existingEvaluation.status !== "manager_submitted") {
        return res.status(400).json({ error: `Evaluation is ${existingEvaluation.status}, not ready for manager review` });
      }
      const { expectationsForNextReview, managerSummary, newExperienceLevel, outcomes, overallScore } = req.body;
      if (expectationsForNextReview !== undefined) updates.expectationsForNextReview = expectationsForNextReview;
      if (managerSummary !== undefined) updates.managerSummary = managerSummary;
      if (newExperienceLevel !== undefined) updates.newExperienceLevel = newExperienceLevel;
      if (outcomes !== undefined) updates.outcomes = outcomes;
      if (overallScore !== undefined) updates.overallScore = overallScore;
      updates.status = requestedStatus;
      updates.managerSubmittedAt = new Date();
      if (requestedStatus === "completed") {
        updates.completedAt = new Date();
      }
    } else if (requestedStatus !== undefined) {
      return res.status(400).json({ error: "Invalid status value" });
    } else {
      // No status transition — draft-saving manager-side fields.
      if (!isManagerOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { expectationsForNextReview, managerSummary, newExperienceLevel, outcomes, overallScore } = req.body;
      if (expectationsForNextReview !== undefined) updates.expectationsForNextReview = expectationsForNextReview;
      if (managerSummary !== undefined) updates.managerSummary = managerSummary;
      if (newExperienceLevel !== undefined) updates.newExperienceLevel = newExperienceLevel;
      if (outcomes !== undefined) updates.outcomes = outcomes;
      if (overallScore !== undefined) updates.overallScore = overallScore;
    }

    const evaluation = await storage.updateEvaluation(req.params.id, updates);

    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }

    if (updates.status === "ic_submitted") {
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

    if (updates.status === "completed") {
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

        if (evaluation.outcomes && evaluation.outcomes.length > 0) {
          try {
            await notifyEvaluationOutcome(
              evaluation.id,
              ic.id,
              evaluation.outcomes,
              manager.id,
            );
          } catch (err) {
            console.error("Failed to send evaluation outcome notification:", err);
          }
        }

        if (evaluation.newExperienceLevel && evaluation.newExperienceLevel !== ic.experienceLevel) {
          await storage.updateUser(ic.id, { experienceLevel: evaluation.newExperienceLevel });
        }
      }
    }

    res.json(evaluation);
  }));

  // Evaluation sections routes - protected
  app.patch("/api/evaluation-sections/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const section = await storage.getEvaluationSection(req.params.id);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const evaluation = await storage.getEvaluation(section.evaluationId);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (!checkOrgBoundary(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    const isICOwner = currentUser.id === evaluation.icId;
    const isManagerOwner = currentUser.id === evaluation.managerId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    const updates: Record<string, any> = {};
    if (isICOwner && evaluation.status === "draft") {
      const { selfRating, selfDocumentation, improvementGoal } = req.body;
      if (selfRating !== undefined) updates.selfRating = selfRating;
      if (selfDocumentation !== undefined) updates.selfDocumentation = selfDocumentation;
      if (improvementGoal !== undefined) updates.improvementGoal = improvementGoal;
    } else if ((isManagerOwner || isAdmin) && (evaluation.status === "ic_submitted" || evaluation.status === "manager_submitted")) {
      const { managerRating, managerFeedback, founderFeedback } = req.body;
      if (managerRating !== undefined) updates.managerRating = managerRating;
      if (managerFeedback !== undefined) updates.managerFeedback = managerFeedback;
      if (founderFeedback !== undefined) updates.founderFeedback = founderFeedback;
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await storage.updateEvaluationSection(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json(updated);
  }));

  app.post("/api/evaluations/:id/sections/bulk-update", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;

    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (!checkOrgBoundary(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    const isICOwner = currentUser.id === evaluation.icId;
    const isManagerOwner = currentUser.id === evaluation.managerId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    const asIC = isICOwner && evaluation.status === "draft";
    const asManager = (isManagerOwner || isAdmin) && (evaluation.status === "ic_submitted" || evaluation.status === "manager_submitted");

    if (!asIC && !asManager) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const { sections } = req.body;
      if (!Array.isArray(sections)) {
        return res.status(400).json({ error: "sections must be an array" });
      }

      // Only allow updates to sections that actually belong to this evaluation,
      // and only the fields the caller's role is permitted to write.
      const evaluationSections = await storage.getEvaluationSections(req.params.id);
      const validSectionIds = new Set(evaluationSections.map(s => s.id));

      const updatedSections = [];
      for (const sectionUpdate of sections) {
        if (!validSectionIds.has(sectionUpdate.id)) continue;
        const fieldUpdates: Record<string, any> = {};
        if (asIC) {
          if (sectionUpdate.selfRating !== undefined) fieldUpdates.selfRating = sectionUpdate.selfRating;
          if (sectionUpdate.selfDocumentation !== undefined) fieldUpdates.selfDocumentation = sectionUpdate.selfDocumentation;
          if (sectionUpdate.improvementGoal !== undefined) fieldUpdates.improvementGoal = sectionUpdate.improvementGoal;
        } else {
          if (sectionUpdate.managerRating !== undefined) fieldUpdates.managerRating = sectionUpdate.managerRating;
          if (sectionUpdate.managerFeedback !== undefined) fieldUpdates.managerFeedback = sectionUpdate.managerFeedback;
          if (sectionUpdate.founderFeedback !== undefined) fieldUpdates.founderFeedback = sectionUpdate.founderFeedback;
        }
        const updated = await storage.updateEvaluationSection(sectionUpdate.id, fieldUpdates);
        if (updated) {
          updatedSections.push(updated);
        }
      }

      res.json(updatedSections);
    } catch (error) {
      res.status(500).json({ error: "Failed to update sections" });
    }
  }));

  // Finalize evaluation with all data in one call (no save draft required)
  app.post("/api/evaluations/:id/finalize", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;

    const existingEvaluation = await storage.getEvaluation(req.params.id);
    if (!existingEvaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (!checkOrgBoundary(currentUser, existingEvaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    const isICOwner = currentUser.id === existingEvaluation.icId;
    const isManagerOwner = currentUser.id === existingEvaluation.managerId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    const { sections, evaluationUpdates, finalizeAs } = req.body;

    if (finalizeAs === "ic") {
      if (!isICOwner) {
        return res.status(403).json({ error: "Only the evaluation owner can submit their self-assessment" });
      }
      if (existingEvaluation.status !== "draft") {
        return res.status(400).json({ error: `Evaluation is ${existingEvaluation.status}, not draft` });
      }
    } else if (finalizeAs === "manager") {
      // Only the assigned manager or an org admin may finalize as manager —
      // this is what stops an IC from self-completing and self-promoting.
      if (!isManagerOwner && !isAdmin) {
        return res.status(403).json({ error: "Only the assigned manager can finalize this evaluation" });
      }
      if (existingEvaluation.status !== "ic_submitted" && existingEvaluation.status !== "manager_submitted") {
        return res.status(400).json({ error: `Evaluation is ${existingEvaluation.status}, not ready for manager review` });
      }
    } else {
      return res.status(400).json({ error: "finalizeAs must be 'ic' or 'manager'" });
    }

    try {
      // Only sections belonging to this evaluation may be touched, and only
      // with the fields the caller's role (ic vs manager) is allowed to set.
      const evaluationSections = await storage.getEvaluationSections(req.params.id);
      const validSectionIds = new Set(evaluationSections.map(s => s.id));

      if (Array.isArray(sections) && sections.length > 0) {
        for (const sectionUpdate of sections) {
          if (!validSectionIds.has(sectionUpdate.id)) continue;
          const fieldUpdates: Record<string, any> = {};
          if (finalizeAs === "ic") {
            if (sectionUpdate.selfRating !== undefined) fieldUpdates.selfRating = sectionUpdate.selfRating;
            if (sectionUpdate.selfDocumentation !== undefined) fieldUpdates.selfDocumentation = sectionUpdate.selfDocumentation;
            if (sectionUpdate.improvementGoal !== undefined) fieldUpdates.improvementGoal = sectionUpdate.improvementGoal;
          } else {
            if (sectionUpdate.managerRating !== undefined) fieldUpdates.managerRating = sectionUpdate.managerRating;
            if (sectionUpdate.managerFeedback !== undefined) fieldUpdates.managerFeedback = sectionUpdate.managerFeedback;
            if (sectionUpdate.founderFeedback !== undefined) fieldUpdates.founderFeedback = sectionUpdate.founderFeedback;
          }
          await storage.updateEvaluationSection(sectionUpdate.id, fieldUpdates);
        }
      }

      // Determine new status and timestamps
      const updates: Record<string, any> = {};

      if (finalizeAs === "ic") {
        updates.status = "ic_submitted";
        updates.icSubmittedAt = new Date();
      } else {
        updates.status = "completed";
        updates.managerSubmittedAt = new Date();
        updates.completedAt = new Date();

        if (evaluationUpdates) {
          const { expectationsForNextReview, managerSummary, newExperienceLevel, outcomes } = evaluationUpdates;
          if (expectationsForNextReview !== undefined) updates.expectationsForNextReview = expectationsForNextReview;
          if (managerSummary !== undefined) updates.managerSummary = managerSummary;
          if (newExperienceLevel !== undefined) updates.newExperienceLevel = newExperienceLevel;
          if (outcomes !== undefined) updates.outcomes = outcomes;
        }

        // Calculate overall score from section ratings
        const allSections = await storage.getEvaluationSections(req.params.id);
        const managerRatings = allSections
          .map(s => s.managerRating)
          .filter((r): r is number => r !== null && r !== undefined);

        if (managerRatings.length > 0) {
          const avgScore = Math.round(managerRatings.reduce((a, b) => a + b, 0) / managerRatings.length);
          updates.overallScore = avgScore;
        }

        // Update IC's experience level if newExperienceLevel is set — safe
        // here because this branch is only reachable by the assigned manager/admin.
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
  }));

  // Feedback invitation routes - protected
  app.get("/api/feedback-invitations", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { evaluationId } = req.query;
    if (!evaluationId) {
      return res.json([]);
    }
    const evaluation = await storage.getEvaluation(evaluationId as string);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isParticipant = currentUser.id === evaluation.icId || currentUser.id === evaluation.managerId;
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!checkOrgBoundary(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }
    const invitations = await storage.getFeedbackInvitationsByEvaluation(evaluationId as string);
    res.json(invitations);
  }));

  app.post("/api/feedback-invitations", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const { evaluationId, email } = req.body;
    if (!evaluationId || !email) {
      return res.status(400).json({ error: "evaluationId and email are required" });
    }

    const evaluation = await storage.getEvaluation(evaluationId);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const isParticipant = currentUser.id === evaluation.icId || currentUser.id === evaluation.managerId;
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!checkOrgBoundary(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden - Cross-organization access denied" });
    }

    const users = await storage.getAllUsers(currentUser.organizationId ?? undefined);
    const invitedUser = users.find(u => u.email === email);
    if (!invitedUser) {
      return res.status(400).json({ error: "No user with this email was found in your organization" });
    }

    try {
      const invitation = await storage.createFeedbackInvitation({
        evaluationId,
        invitedUserId: invitedUser.id,
        invitedById: currentUser.id,
        organizationId: currentUser.organizationId,
      });

      try {
        await storage.createActivityLog({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: "Feedback invitation sent",
          details: `Invited ${email} to provide feedback`,
          entityType: "evaluation",
          entityId: evaluationId,
        });
      } catch (e) {
        console.error("Failed to create activity log:", e);
      }

      // Notify the invited user (in-app + email).
      try {
        const ic = await storage.getUser(evaluation.icId);
        const icName = ic ? `${ic.firstName} ${ic.lastName}` : "a team member";
        await notifyFeedbackRequested(evaluationId, currentUser.id, invitedUser.id, icName);
      } catch (notifyErr) {
        console.error("Failed to send feedback invitation notification:", notifyErr);
      }

      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to send invitation" });
    }
  }));

  app.patch("/api/feedback-invitations/:id", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existing = await storage.getFeedbackInvitation(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    if (existing.invitedUserId !== currentUser.id) {
      return res.status(403).json({ error: "Only the invited reviewer can submit this feedback" });
    }
    if (existing.status === "completed") {
      return res.status(400).json({ error: "This feedback has already been submitted" });
    }

    const { feedback, rating, status } = req.body;
    const updates: Record<string, any> = {};
    if (feedback !== undefined) updates.feedback = feedback;
    if (rating !== undefined) updates.rating = rating;
    if (status !== undefined) updates.status = status;
    if (status === "completed") updates.completedAt = new Date();

    const invitation = await storage.updateFeedbackInvitation(req.params.id, updates);
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    res.json(invitation);
  }));

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

  // Bulk: OOO / leave requests
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

  // Bulk: invoices
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
          // Auto-approve linked timesheet (mirrors single-item route).
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
          // On rejection, unlock the linked timesheet back to draft (mirrors single-item route).
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

    // Always write bulk summary, even on full failure, for audit traceability.
    try {
      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: `Bulk invoice ${status}`,
        details: `Bulk action by ${currentUser.firstName} ${currentUser.lastName}: ${status} ${summary.successCount} of ${ids.length} invoices (${summary.failureCount} failed)`,
        entityType: "invoice",
        // entityId omitted: bulk summary spans multiple records
      });
    } catch {}

    res.json(summary);
  }));

  // ── Admin Blog API routes (auth-protected, admin only) ─────────────────
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
    res.json(getSubscribers());
  }));

  app.get("/api/admin/blog", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(getBlogArticles());
  }));

  app.get("/api/admin/blog-analytics", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
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

  app.post("/api/admin/blog", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
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
      const article = updateArticle(req.params.slug, updates);
      res.json(article);
    } catch (err) {
      handleBlogError(err, res as any);
    }
  }));

  app.delete("/api/admin/blog/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
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

  // ── Programmatic SEO: industry pages ──
  app.get("/contractor-management-for-:industry", (req, res) => {
    const html = getIndustryHtml(req.params.industry);
    if (!html) {
      res.status(404).send("<h1>Page not found</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(html);
  });

  app.get("/industries", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(getIndustriesIndexHtml());
  });

  // ── Programmatic SEO: competitor comparison pages ──
  app.get("/compare", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(getCompetitorsIndexHtml());
  });

  app.get(/^\/([a-z0-9-]+-alternative)$/, (req, res) => {
    const slug = req.params[0];
    const html = getCompetitorHtml(slug);
    if (!html) {
      res.status(404).send("<h1>Page not found</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", BLOG_CACHE);
    res.send(html);
  });

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
    res.json(getIndustries());
  }));
  app.post("/api/admin/seo/industries", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateIndustryBody(req.body);
    if (err) return res.status(400).json({ error: err });
    try { res.status(201).json(createIndustry(req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.put("/api/admin/seo/industries/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateIndustryBody(req.body, "update");
    if (err) return res.status(400).json({ error: err });
    try { res.json(updateIndustry(req.params.slug, req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.delete("/api/admin/seo/industries/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try { deleteIndustry(req.params.slug); res.status(204).end(); } catch (e) { handleProgrammaticError(e, res); }
  }));

  app.get("/api/admin/seo/competitors", authMiddleware, requirePlatformAdmin, asyncHandler(async (_req, res) => {
    res.json(getCompetitors());
  }));
  app.post("/api/admin/seo/competitors", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateCompetitorBody(req.body);
    if (err) return res.status(400).json({ error: err });
    try { res.status(201).json(createCompetitor(req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.put("/api/admin/seo/competitors/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const err = validateCompetitorBody(req.body, "update");
    if (err) return res.status(400).json({ error: err });
    try { res.json(updateCompetitor(req.params.slug, req.body)); } catch (e) { handleProgrammaticError(e, res); }
  }));
  app.delete("/api/admin/seo/competitors/:slug", authMiddleware, requirePlatformAdmin, asyncHandler(async (req, res) => {
    try { deleteCompetitor(req.params.slug); res.status(204).end(); } catch (e) { handleProgrammaticError(e, res); }
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

  const BASE_URL = "https://axlehq.app";

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
    const industryUrls = getPublishedIndustries().map((i) => ({
      loc: `${BASE_URL}/contractor-management-for-${i.slug}`,
      lastmod: i.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const competitorUrls = getPublishedCompetitors().map((c) => ({
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
  });

  app.get("/sitemap-programmatic.xml", (_req, res) => {
    const industryUrls = getPublishedIndustries().map((i) => ({
      loc: `${BASE_URL}/contractor-management-for-${i.slug}`,
      lastmod: i.updatedDate,
      changefreq: "monthly" as const,
      priority: "0.8",
    }));
    const competitorUrls = getPublishedCompetitors().map((c) => ({
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
