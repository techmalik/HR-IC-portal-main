import fs from "fs";
import path from "path";
import { db } from "../db";
import {
  programmaticIndustries,
  programmaticCompetitors,
  type ProgrammaticIndustryRow,
  type ProgrammaticCompetitorRow,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { defaultIndustries, defaultCompetitors, type IndustryPage, type CompetitorPage, type PageStatus } from "./programmaticData";

const INDUSTRIES_FILE = path.resolve(process.cwd(), "data/programmatic-industries.json");
const COMPETITORS_FILE = path.resolve(process.cwd(), "data/programmatic-competitors.json");

export class ProgrammaticNotFoundError extends Error {
  readonly status = 404;
  constructor(slug: string) {
    super(`Page "${slug}" not found`);
  }
}
export class ProgrammaticConflictError extends Error {
  readonly status = 409;
  constructor(slug: string) {
    super(`A page with slug "${slug}" already exists`);
  }
}

function loadSeedFile<T>(file: string, defaults: T[]): T[] {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
  } catch (err) {
    console.error(`[programmaticStorage] Failed to read ${file}, seeding from defaults:`, err);
    return defaults;
  }
}

function toIndustryPage(row: ProgrammaticIndustryRow): IndustryPage {
  return {
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    heroTitle: row.heroTitle,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    intro: row.intro,
    painPoints: row.painPoints as string[],
    useCases: row.useCases as { title: string; description: string }[],
    faqs: row.faqs as { q: string; a: string }[],
    updatedDate: row.updatedDate,
    status: (row.status as PageStatus) ?? "published",
  };
}

function toCompetitorPage(row: ProgrammaticCompetitorRow): CompetitorPage {
  return {
    slug: row.slug,
    competitorName: row.competitorName,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    intro: row.intro,
    positioning: row.positioning,
    competitorWeaknesses: row.competitorWeaknesses as string[],
    axleStrengths: row.axleStrengths as string[],
    comparison: row.comparison as { feature: string; axle: string; competitor: string }[],
    pricingNote: row.pricingNote,
    faqs: row.faqs as { q: string; a: string }[],
    updatedDate: row.updatedDate,
    status: (row.status as PageStatus) ?? "published",
  };
}

let industriesSeeded = false;
async function ensureIndustriesSeeded(): Promise<void> {
  if (industriesSeeded) return;
  const existing = await db.select({ slug: programmaticIndustries.slug }).from(programmaticIndustries).limit(1);
  if (existing.length === 0) {
    const items = loadSeedFile<IndustryPage>(INDUSTRIES_FILE, defaultIndustries);
    if (items.length > 0) {
      const now = Date.now();
      await db
        .insert(programmaticIndustries)
        .values(
          items.map((i, idx) => ({
            slug: i.slug,
            name: i.name,
            shortName: i.shortName,
            heroTitle: i.heroTitle,
            metaTitle: i.metaTitle,
            metaDescription: i.metaDescription,
            intro: i.intro,
            painPoints: i.painPoints,
            useCases: i.useCases,
            faqs: i.faqs,
            updatedDate: i.updatedDate,
            status: i.status ?? "published",
            createdAt: new Date(now - idx * 1000),
          }))
        )
        .onConflictDoNothing();
    }
  }
  industriesSeeded = true;
}

let competitorsSeeded = false;
async function ensureCompetitorsSeeded(): Promise<void> {
  if (competitorsSeeded) return;
  const existing = await db.select({ slug: programmaticCompetitors.slug }).from(programmaticCompetitors).limit(1);
  if (existing.length === 0) {
    const items = loadSeedFile<CompetitorPage>(COMPETITORS_FILE, defaultCompetitors);
    if (items.length > 0) {
      const now = Date.now();
      await db
        .insert(programmaticCompetitors)
        .values(
          items.map((c, idx) => ({
            slug: c.slug,
            competitorName: c.competitorName,
            metaTitle: c.metaTitle,
            metaDescription: c.metaDescription,
            intro: c.intro,
            positioning: c.positioning,
            competitorWeaknesses: c.competitorWeaknesses,
            axleStrengths: c.axleStrengths,
            comparison: c.comparison,
            pricingNote: c.pricingNote,
            faqs: c.faqs,
            updatedDate: c.updatedDate,
            status: c.status ?? "published",
            createdAt: new Date(now - idx * 1000),
          }))
        )
        .onConflictDoNothing();
    }
  }
  competitorsSeeded = true;
}

// ── Industries ──
export async function getIndustries(): Promise<IndustryPage[]> {
  await ensureIndustriesSeeded();
  const rows = await db.select().from(programmaticIndustries).orderBy(desc(programmaticIndustries.createdAt));
  return rows.map(toIndustryPage);
}
export async function getPublishedIndustries(): Promise<IndustryPage[]> {
  return (await getIndustries()).filter((i) => (i.status ?? "published") === "published");
}
export async function getIndustryBySlug(slug: string): Promise<IndustryPage | undefined> {
  await ensureIndustriesSeeded();
  const [row] = await db.select().from(programmaticIndustries).where(eq(programmaticIndustries.slug, slug));
  return row ? toIndustryPage(row) : undefined;
}
export async function getPublishedIndustryBySlug(slug: string): Promise<IndustryPage | undefined> {
  const i = await getIndustryBySlug(slug);
  return i && (i.status ?? "published") === "published" ? i : undefined;
}
export async function createIndustry(page: IndustryPage): Promise<IndustryPage> {
  await ensureIndustriesSeeded();
  const [existing] = await db.select().from(programmaticIndustries).where(eq(programmaticIndustries.slug, page.slug));
  if (existing) throw new ProgrammaticConflictError(page.slug);
  await db.insert(programmaticIndustries).values({ ...page, status: page.status ?? "published" });
  return page;
}
export async function updateIndustry(slug: string, updates: Partial<IndustryPage>): Promise<IndustryPage> {
  await ensureIndustriesSeeded();
  const [existing] = await db.select().from(programmaticIndustries).where(eq(programmaticIndustries.slug, slug));
  if (!existing) throw new ProgrammaticNotFoundError(slug);
  if (updates.slug && updates.slug !== slug) {
    const [conflict] = await db.select().from(programmaticIndustries).where(eq(programmaticIndustries.slug, updates.slug));
    if (conflict) throw new ProgrammaticConflictError(updates.slug);
  }
  const [updated] = await db
    .update(programmaticIndustries)
    .set(updates)
    .where(eq(programmaticIndustries.slug, slug))
    .returning();
  return toIndustryPage(updated);
}
export async function deleteIndustry(slug: string): Promise<void> {
  await ensureIndustriesSeeded();
  const result = await db
    .delete(programmaticIndustries)
    .where(eq(programmaticIndustries.slug, slug))
    .returning({ slug: programmaticIndustries.slug });
  if (result.length === 0) throw new ProgrammaticNotFoundError(slug);
}

// ── Competitors ──
export async function getCompetitors(): Promise<CompetitorPage[]> {
  await ensureCompetitorsSeeded();
  const rows = await db.select().from(programmaticCompetitors).orderBy(desc(programmaticCompetitors.createdAt));
  return rows.map(toCompetitorPage);
}
export async function getPublishedCompetitors(): Promise<CompetitorPage[]> {
  return (await getCompetitors()).filter((c) => (c.status ?? "published") === "published");
}
export async function getCompetitorBySlug(slug: string): Promise<CompetitorPage | undefined> {
  await ensureCompetitorsSeeded();
  const [row] = await db.select().from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, slug));
  return row ? toCompetitorPage(row) : undefined;
}
export async function getPublishedCompetitorBySlug(slug: string): Promise<CompetitorPage | undefined> {
  const c = await getCompetitorBySlug(slug);
  return c && (c.status ?? "published") === "published" ? c : undefined;
}
export async function createCompetitor(page: CompetitorPage): Promise<CompetitorPage> {
  await ensureCompetitorsSeeded();
  const [existing] = await db.select().from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, page.slug));
  if (existing) throw new ProgrammaticConflictError(page.slug);
  await db.insert(programmaticCompetitors).values({ ...page, status: page.status ?? "published" });
  return page;
}
export async function updateCompetitor(slug: string, updates: Partial<CompetitorPage>): Promise<CompetitorPage> {
  await ensureCompetitorsSeeded();
  const [existing] = await db.select().from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, slug));
  if (!existing) throw new ProgrammaticNotFoundError(slug);
  if (updates.slug && updates.slug !== slug) {
    const [conflict] = await db.select().from(programmaticCompetitors).where(eq(programmaticCompetitors.slug, updates.slug));
    if (conflict) throw new ProgrammaticConflictError(updates.slug);
  }
  const [updated] = await db
    .update(programmaticCompetitors)
    .set(updates)
    .where(eq(programmaticCompetitors.slug, slug))
    .returning();
  return toCompetitorPage(updated);
}
export async function deleteCompetitor(slug: string): Promise<void> {
  await ensureCompetitorsSeeded();
  const result = await db
    .delete(programmaticCompetitors)
    .where(eq(programmaticCompetitors.slug, slug))
    .returning({ slug: programmaticCompetitors.slug });
  if (result.length === 0) throw new ProgrammaticNotFoundError(slug);
}
