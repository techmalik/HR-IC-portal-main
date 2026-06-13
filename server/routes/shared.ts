/**
 * Shared middleware, guards, and helpers used across every domain route file.
 * Import from here rather than duplicating in each module.
 */
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { getUserIdFromToken, rotateSessionIfNeeded } from "../sessionManager";
import type { User } from "@shared/schema";

// Extend Express Request so TypeScript knows about authenticatedUser.
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: User;
    }
  }
}

export async function getCurrentUser(req: Request): Promise<User | undefined | null> {
  const token = req.cookies?.session_token;
  if (!token) return null;
  const userId = await getUserIdFromToken(token);
  if (!userId) return null;
  return storage.getUser(userId);
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized - Invalid or missing token" });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: "Account is disabled" });
  }

  // Enforce mustChangePassword — only the password-change and logout endpoints
  // are exempt so the user can actually change their password.
  if (user.mustChangePassword) {
    const isPasswordChangePath = /^\/api\/users\/[^/]+\/password$/.test(req.path);
    const isLogoutPath = req.path === "/api/auth/logout";
    if (!isPasswordChangePath && !isLogoutPath) {
      return res.status(403).json({ error: "Password change required", mustChangePassword: true });
    }
  }

  req.authenticatedUser = user;

  // Rotate session token when it's past half its lifetime.
  if (token) {
    const newToken = await rotateSessionIfNeeded(token);
    if (newToken) {
      res.cookie("session_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });
    }
  }

  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.authenticatedUser;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    next();
  };
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.authenticatedUser;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Forbidden - Platform admin access required" });
  }
  next();
}

export function checkOrgBoundary(
  currentUser: User,
  targetUser: { organizationId: string | null }
): boolean {
  if (!currentUser.organizationId) return false;
  return currentUser.organizationId === targetUser.organizationId;
}

export async function hasSupervisorPrivileges(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  if (user.role === "admin" || user.role === "owner") return true;
  const directReports = await storage.getUsersBySupervisor(userId);
  return directReports.length > 0;
}

export async function getTeamMemberIds(supervisorId: string): Promise<string[]> {
  const members = await storage.getUsersBySupervisor(supervisorId);
  return members.map((m) => m.id);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`[API Error] ${req.method} ${req.path}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  };
}
