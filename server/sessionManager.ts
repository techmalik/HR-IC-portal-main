import crypto from "crypto";
import { db } from "./db";
import { sessions } from "@shared/schema";
import { eq, lt } from "drizzle-orm";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

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
