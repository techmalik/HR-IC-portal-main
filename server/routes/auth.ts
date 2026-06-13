/**
 * Authentication routes: login, register, logout, forgot-password,
 * reset-password, and the /me endpoint.
 */
import type { Express } from "express";
import { storage, comparePassword } from "../storage";
import { createSession, invalidateSession } from "../sessionManager";
import { sendPasswordResetEmail } from "../emailService";
import { getCurrentUser } from "./shared";

// ---------------------------------------------------------------------------
// Rate limiting state — keyed on "ip:username" so shared IPs don't block each
// other and per-username limits still hold regardless of IP rotation.
// ---------------------------------------------------------------------------
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_LOGIN_ATTEMPTS = 5;

function checkRateLimit(ip: string, username: string): boolean {
  const key = `${ip}:${username.toLowerCase()}`;
  const now = Date.now();
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

function resetRateLimit(ip: string, username: string): void {
  loginAttempts.delete(`${ip}:${username.toLowerCase()}`);
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------
export function registerAuthRoutes(app: Express): void {
  // Auth routes (no auth middleware - public endpoints)
  app.post("/api/auth/login", async (req, res) => {
    // req.ip respects trust proxy setting; fall back to socket address only as last resort
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (!checkRateLimit(clientIp, username)) {
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
    resetRateLimit(clientIp, username);

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

    if (password.length < 12) {
      return res.status(400).json({ error: "Password must be at least 12 characters" });
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
    void subscription;

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

  // Self-service password reset — always responds 200 to prevent email enumeration.
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.json({ message: "If that email is registered, a reset link has been sent." });
      }
      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (user && user.isActive) {
        const resetToken = await storage.createPasswordResetToken(user.id);
        await sendPasswordResetEmail(user.email!, resetToken);
      }
    } catch (e) {
      console.error("[Auth] forgot-password error:", e);
    }
    // Always return the same message to prevent email enumeration.
    res.json({ message: "If that email is registered, a reset link has been sent." });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Reset token is required" });
    }
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: "Password must be at least 12 characters" });
    }
    const userId = await storage.getUserIdForResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    await storage.updateUser(userId, { password: newPassword, mustChangePassword: false });
    await storage.deletePasswordResetToken(token);
    res.json({ message: "Password reset successfully. You can now log in." });
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
    const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isPlatformAdmin = allowedEmails.includes(user.email.toLowerCase());
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, hasDirectReports, isPlatformAdmin });
  });
}
