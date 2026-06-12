import { db } from "../db";
import { programmaticIndustries, programmaticCompetitors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { defaultIndustries, defaultCompetitors, type IndustryPage, type CompetitorPage } from "./programmaticData";

export class ProgrammaticNotFoundError extends Error {
  readonly status = 404;
  constructor(slug: string) { super(`Page "${slug}" not found`); this.name = "ProgrammaticNotFoundError"; }
}
export class ProgrammaticConflictError extends Error {
  readonly status = 409;
  constructor(slug: string) { super(`A page with slug "${slug}" already exists`); this.name = "ProgrammaticConflictError"; }
}

let industriesSeeded = false;
let competitorsSeeded = false;

async function ensureIndustriesSeeded(): Promise<void> {
  if (industriesSeeded) return;
  industriesSeeded = true;
  try {
    const existing = await db.select({ slug: programmaticIndustries.slug }).from(programmaticIndustries).limit(1);
    if (existing.length === 0 && defaultIndustries.length > 0) {
      await db.insert(programmaticIndustries).values(
        defaultIndustries.map((i) => ({ slug: i.slug, data: i as unknown as Record<string, unknown> })),
      ).onConflictDoNothing();
    }
  } catch (err) {
    console.error("[programmaticStorage] Industry seed failed:", err);
  }
}

async function ensureCompetitorsSeeded(): Promise<void> {
  if (competitorsSeeded) return;
  competitorsSeeded = true;
  try {
    const existing = await db.select({ slug: programmaticCompetitors.slug }).from(programmaticCompetitors).limit(1);
    if (existing.length === 0 && defaultCompetitors.length > 0) {
      await db.insert(programmaticCompetitors).values(
        defaultCompetitors.map((c) => ({ slug: c.slug, data: c as unknown as Record<string, unknown> })),
      ).onConflictDoNothing();
    }
  } catch (err) {
    console.error("[programmaticStorage] Competitor seed failed:", err);
  }
}

// ── Industries ──
export async function getIndustries(): Promise<IndustryPage[]> {
  await ensureIndustriesSeeded();
  const rows = await db.select().from(programmaticIndustries);
  return rows.map((r) => ({ status: "published" as const, ...(r.data as unknown as IndustryPage) }));
}
export async function getPublishedIndustries(): Promise<IndustryPage[]> {
  const all = await getIndustries();
  return all.filter((i) => (i.status ?? "published") === "published");
}
export async function getIndustryBySlug(slug: string): Promise<IndustryPage | undefined> {
  await ensureIndustriesSeeded();
  const result = await db.select().from(programmaticIndustries).where(eq(programmaticIndustries.slug, slug));
  if (!result[0]) return undefined;
  return { status: "published" as const, ...(result[0].data as unknown as IndustryPage) };
}
export async function getPublishedIndustryBySlug(slug: string): Promise<IndustryPage | undefined> {
  const i = await getIndustryBySlug(slug);
  return i && (i.status ?? "published") === "published" ? i : undefined;
}
export async function createIndustry(page: IndustryPage): Promise<IndustryPage> {
  const existing = await db.select({ slug: programmaticIndustries.slug }).from(programmaticIndustries).where(eq(programmaticIndustries.slug, page.slug));
  if (existing.length > 0) throw new ProgrammaticConflictError(page.slug);
  await db.insert(programmaticIndustries).values({ slug: page.slug, data: page as unknown as Record<string, unknown> });
  return page;
}
export async function updateIndustry(slug: string, updates: Partial<IndustryPage>): Promise<IndustryPage> {
  const result = await db.select().from(programmaticIndustries).where(eq(programmaticIndustries.slug, slug));
  if (!result[0]) throw new ProgrammaticNotFoundError(slug);
  if (updates.slug && updates.slug !== slug) {
    const conflict = await db.select({ slug: programmaticIndustries.slug }).from(programmaticIndustries).where(eq(programmaticIndustries.slug, updates.slug));
    if (conflict.length > 0) throw new ProgrammaticConflictError(updates.slug);
  }
  const merged = { ...(result[0].data as unknown as IndustryPage), ...updates };
  const targetSlug = updates.slug ?? slug;
  if (updates.slug && updates.slug !== slug) {
    await db.delete(programmaticIndustries).where(eq(programmaticIndustries.slug, slug));
    await db.insert(programmaticIndustries).values({ slug: targetSlug, data: merged as unknown as Record<string, unknown> });
  } else {
    await db.update(programmaticIndustries).set({ data: merged as unknown as Record<string, unknown> }).where(eq(programmaticIndustries.slug, slug));
  }
  return merged;
}
export async function deleteIndustry(slug: string): Promise<void> {
  const result = await db.delete(programmaticIndustries).where(eq(programmaticIndustries.slug, slug)).returning();
  if (result.length === 0) throw new ProgrammaticNotFoundError(slug);
}

// ── Competitors ──
export async function getCompetitors(): Promise<CompetitorPage[]> {
  await ensureCompetitorsSeeded();
  const rows = await db.select().from(programmaticCompetitors);
  return rows.map((r) => ({ status: "published" as const, ...(r.data as unknown as CompetitorPage) }));
}
export async function getPublishedCompetitors(): Promise<CompetitorPage[]> {
  const all = await getCompetitors();
  return all.filter((c) => (c.status ?? "published") === "published");
}
export async function getCompetitorBySlug(slug: string): Promise<CompetitorPage | undefined> {
  await ensureCompetitorsSeeded();
  const result = await db.select().from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, slug));
  if (!result[0]) return undefined;
  return { status: "published" as const, ...(result[0].data as unknown as CompetitorPage) };
}
export async function getPublishedCompetitorBySlug(slug: string): Promise<CompetitorPage | undefined> {
  const c = await getCompetitorBySlug(slug);
  return c && (c.status ?? "published") === "published" ? c : undefined;
}
export async function createCompetitor(page: CompetitorPage): Promise<CompetitorPage> {
  const existing = await db.select({ slug: programmaticCompetitors.slug }).from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, page.slug));
  if (existing.length > 0) throw new ProgrammaticConflictError(page.slug);
  await db.insert(programmaticCompetitors).values({ slug: page.slug, data: page as unknown as Record<string, unknown> });
  return page;
}
export async function updateCompetitor(slug: string, updates: Partial<CompetitorPage>): Promise<CompetitorPage> {
  const result = await db.select().from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, slug));
  if (!result[0]) throw new ProgrammaticNotFoundError(slug);
  if (updates.slug && updates.slug !== slug) {
    const conflict = await db.select({ slug: programmaticCompetitors.slug }).from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, updates.slug));
    if (conflict.length > 0) throw new ProgrammaticConflictError(updates.slug);
  }
  const merged = { ...(result[0].data as unknown as CompetitorPage), ...updates };
  const targetSlug = updates.slug ?? slug;
  if (updates.slug && updates.slug !== slug) {
    await db.delete(programmaticCompetitors).where(eq(programmaticCompetitors.slug, slug));
    await db.insert(programmaticCompetitors).values({ slug: targetSlug, data: merged as unknown as Record<string, unknown> });
  } else {
    await db.update(programmaticCompetitors).set({ data: merged as unknown as Record<string, unknown> }).where(eq(programmaticCompetitors.slug, slug));
  }
  return merged;
}
export async function deleteCompetitor(slug: string): Promise<void> {
  const result = await db.delete(programmaticCompetitors).where(eq(programmaticCompetitors.slug, slug)).returning();
  if (result.length === 0) throw new ProgrammaticNotFoundError(slug);
}
