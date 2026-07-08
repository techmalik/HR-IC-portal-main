import { db } from "../db";
import { emailSubscribers } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface EmailSubscriber {
  email: string;
  subscribedAt: string;
  source: string;
}

export async function getSubscribers(): Promise<EmailSubscriber[]> {
  const rows = await db.select().from(emailSubscribers).orderBy(desc(emailSubscribers.subscribedAt));
  return rows.map((r) => ({
    email: r.email,
    subscribedAt: r.subscribedAt.toISOString(),
    source: r.source,
  }));
}

export async function addSubscriber(email: string, source: string): Promise<{ ok: boolean; alreadyExists: boolean }> {
  const normalized = email.trim().toLowerCase();
  const [existing] = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, normalized));
  if (existing) {
    return { ok: true, alreadyExists: true };
  }
  await db.insert(emailSubscribers).values({ email: normalized, source });
  return { ok: true, alreadyExists: false };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
