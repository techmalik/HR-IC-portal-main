import crypto from "crypto";
import { db } from "./db";
import { sessions } from "@shared/schema";
import { eq, lt, and } from "drizzle-orm";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export type SessionContext = "app" | "backoffice";

// Sessions are stored keyed by sha256(token), not the raw token, so a
// database read (backup leak, SQL injection, etc.) doesn't hand out
// ready-to-use session cookies — the attacker would still need to invert the
// hash. The raw token is only ever held in memory and in the client's cookie.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  username: string,
  context: SessionContext = "app",
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    token: hashToken(token),
    userId,
    username,
    context,
    createdAt: now,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<{ userId: string; username: string } | null> {
  const tokenHash = hashToken(token);
  const result = await db.select().from(sessions).where(eq(sessions.token, tokenHash));
  const session = result[0];

  if (!session) {
    return null;
  }

  if (new Date() > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.token, tokenHash));
    return null;
  }

  return { userId: session.userId, username: session.username };
}

export async function validateSessionForContext(
  token: string,
  context: SessionContext,
): Promise<{ userId: string; username: string } | null> {
  const tokenHash = hashToken(token);
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, tokenHash), eq(sessions.context, context)));
  const session = result[0];

  if (!session) {
    return null;
  }

  if (new Date() > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.token, tokenHash));
    return null;
  }

  return { userId: session.userId, username: session.username };
}

export async function invalidateSession(token: string): Promise<boolean> {
  const result = await db.delete(sessions).where(eq(sessions.token, hashToken(token))).returning();
  return result.length > 0;
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const session = await validateSession(token);
  return session?.userId || null;
}

export async function getUserIdFromTokenForContext(
  token: string,
  context: SessionContext,
): Promise<string | null> {
  const session = await validateSessionForContext(token, context);
  return session?.userId || null;
}

export async function cleanupExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
