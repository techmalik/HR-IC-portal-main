import crypto from "crypto";
import { db } from "./db";
import { sessions } from "@shared/schema";
import { eq, lt } from "drizzle-orm";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
// Rotate when less than half the lifetime remains so active users stay logged in.
const SESSION_ROTATION_THRESHOLD_MS = SESSION_DURATION_MS / 2;

export async function createSession(userId: string, username: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  
  await db.insert(sessions).values({
    token,
    userId,
    username,
    createdAt: now,
    expiresAt,
  });
  
  return token;
}

export async function validateSession(token: string): Promise<{ userId: string; username: string } | null> {
  const result = await db.select().from(sessions).where(eq(sessions.token, token));
  const session = result[0];

  if (!session) {
    return null;
  }

  if (new Date() > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }

  return { userId: session.userId, username: session.username };
}

// Returns a new token if the session is within the rotation window, null otherwise.
// The old token is invalidated atomically so only one valid token exists at a time.
export async function rotateSessionIfNeeded(
  oldToken: string,
): Promise<string | null> {
  const result = await db.select().from(sessions).where(eq(sessions.token, oldToken));
  const session = result[0];
  if (!session) return null;

  const now = new Date();
  const remaining = session.expiresAt.getTime() - now.getTime();
  if (remaining > SESSION_ROTATION_THRESHOLD_MS) return null;

  const newToken = crypto.randomBytes(32).toString("hex");
  const newExpiry = new Date(now.getTime() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    token: newToken,
    userId: session.userId,
    username: session.username,
    createdAt: now,
    expiresAt: newExpiry,
  });
  await db.delete(sessions).where(eq(sessions.token, oldToken));

  return newToken;
}

export async function invalidateSession(token: string): Promise<boolean> {
  const result = await db.delete(sessions).where(eq(sessions.token, token)).returning();
  return result.length > 0;
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const session = await validateSession(token);
  return session?.userId || null;
}

export async function cleanupExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
