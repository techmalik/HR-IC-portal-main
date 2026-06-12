import { db } from "../db";
import { emailSubscribers } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface EmailSubscriber {
  email: string;
  subscribedAt: string;
  source: string;
}

export async function getSubscribers(): Promise<EmailSubscriber[]> {
  return db.select().from(emailSubscribers);
}

export async function addSubscriber(email: string, source: string): Promise<{ ok: boolean; alreadyExists: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = await db.select({ email: emailSubscribers.email })
    .from(emailSubscribers)
    .where(eq(emailSubscribers.email, normalized));
  if (existing.length > 0) {
    return { ok: true, alreadyExists: true };
  }
  await db.insert(emailSubscribers).values({
    email: normalized,
    subscribedAt: new Date().toISOString(),
    source,
  });
  return { ok: true, alreadyExists: false };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
