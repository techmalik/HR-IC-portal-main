import crypto from "crypto";
import { db } from "../db";
import { emailSubscribers } from "@shared/schema";
import { eq, desc, isNull, and } from "drizzle-orm";

export interface EmailSubscriber {
  email: string;
  subscribedAt: string;
  source: string;
  unsubscribedAt: string | null;
}

export async function getSubscribers(): Promise<EmailSubscriber[]> {
  const rows = await db.select().from(emailSubscribers).orderBy(desc(emailSubscribers.subscribedAt));
  return rows.map((r) => ({
    email: r.email,
    subscribedAt: r.subscribedAt.toISOString(),
    source: r.source,
    unsubscribedAt: r.unsubscribedAt ? r.unsubscribedAt.toISOString() : null,
  }));
}

export async function addSubscriber(email: string, source: string): Promise<{ ok: boolean; alreadyExists: boolean }> {
  const normalized = email.trim().toLowerCase();
  const [existing] = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, normalized));
  if (existing) {
    // Re-subscribing (e.g. via the blog form again) clears a prior unsubscribe.
    if (existing.unsubscribedAt) {
      await db.update(emailSubscribers).set({ unsubscribedAt: null }).where(eq(emailSubscribers.id, existing.id));
    }
    return { ok: true, alreadyExists: true };
  }
  await db.insert(emailSubscribers).values({ email: normalized, source });
  return { ok: true, alreadyExists: false };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Secret for signing unsubscribe links so an attacker can't unsubscribe an
// arbitrary address by guessing it. Reuses RESEND_API_KEY (already a required
// secret wherever email actually sends) rather than introducing a new
// mandatory env var for this low-stakes case.
const UNSUB_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || "axle-dev-unsubscribe-secret";

export function getUnsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", UNSUB_SECRET).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = getUnsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from((token || "").slice(0, a.length).padEnd(a.length, "\0"));
  return a.length === Buffer.from(token || "").length && crypto.timingSafeEqual(a, b);
}

// Builds a signed, one-click unsubscribe link — ready for any future blog/
// campaign send. No campaign-sending code exists yet, but the link must be
// live before the first one does.
export function buildUnsubscribeUrl(baseUrl: string, email: string): string {
  const token = getUnsubscribeToken(email);
  return `${baseUrl}/api/blog/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

export async function unsubscribe(email: string, token: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized) || !verifyUnsubscribeToken(normalized, token)) {
    return { ok: false, error: "Invalid or expired unsubscribe link." };
  }
  await db
    .update(emailSubscribers)
    .set({ unsubscribedAt: new Date() })
    .where(and(eq(emailSubscribers.email, normalized), isNull(emailSubscribers.unsubscribedAt)));
  return { ok: true };
}
