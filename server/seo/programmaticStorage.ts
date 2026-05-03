import fs from "fs";
import path from "path";
import { defaultIndustries, defaultCompetitors, type IndustryPage, type CompetitorPage } from "./programmaticData";

const INDUSTRIES_FILE = path.resolve(process.cwd(), "data/programmatic-industries.json");
const COMPETITORS_FILE = path.resolve(process.cwd(), "data/programmatic-competitors.json");

export class ProgrammaticNotFoundError extends Error {
  readonly status = 404;
  constructor(slug: string) { super(`Page "${slug}" not found`); }
}
export class ProgrammaticConflictError extends Error {
  readonly status = 409;
  constructor(slug: string) { super(`A page with slug "${slug}" already exists`); }
}

function ensureFile<T>(file: string, defaults: T[]): void {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(defaults, null, 2), "utf8");
  }
}
function readFile<T>(file: string, defaults: T[]): T[] {
  try {
    ensureFile(file, defaults);
    return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
  } catch (err) {
    console.error(`[programmaticStorage] Failed to read ${file}, using defaults:`, err);
    return defaults;
  }
}
function writeFile<T>(file: string, data: T[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// ── Industries ──
export function getIndustries(): IndustryPage[] {
  // Default any record missing a status field to "published" for backward
  // compatibility with the original seed data.
  return readFile(INDUSTRIES_FILE, defaultIndustries).map((i) => ({
    status: "published" as const,
    ...i,
  }));
}
export function getPublishedIndustries(): IndustryPage[] {
  return getIndustries().filter((i) => (i.status ?? "published") === "published");
}
export function getIndustryBySlug(slug: string): IndustryPage | undefined {
  return getIndustries().find((i) => i.slug === slug);
}
export function getPublishedIndustryBySlug(slug: string): IndustryPage | undefined {
  const i = getIndustryBySlug(slug);
  return i && (i.status ?? "published") === "published" ? i : undefined;
}
export function createIndustry(page: IndustryPage): IndustryPage {
  const items = getIndustries();
  if (items.some((i) => i.slug === page.slug)) throw new ProgrammaticConflictError(page.slug);
  items.unshift(page);
  writeFile(INDUSTRIES_FILE, items);
  return page;
}
export function updateIndustry(slug: string, updates: Partial<IndustryPage>): IndustryPage {
  const items = getIndustries();
  const idx = items.findIndex((i) => i.slug === slug);
  if (idx === -1) throw new ProgrammaticNotFoundError(slug);
  if (updates.slug && updates.slug !== slug && items.some((i) => i.slug === updates.slug)) {
    throw new ProgrammaticConflictError(updates.slug);
  }
  items[idx] = { ...items[idx], ...updates };
  writeFile(INDUSTRIES_FILE, items);
  return items[idx];
}
export function deleteIndustry(slug: string): void {
  const items = getIndustries();
  const idx = items.findIndex((i) => i.slug === slug);
  if (idx === -1) throw new ProgrammaticNotFoundError(slug);
  items.splice(idx, 1);
  writeFile(INDUSTRIES_FILE, items);
}

// ── Competitors ──
export function getCompetitors(): CompetitorPage[] {
  return readFile(COMPETITORS_FILE, defaultCompetitors).map((c) => ({
    status: "published" as const,
    ...c,
  }));
}
export function getPublishedCompetitors(): CompetitorPage[] {
  return getCompetitors().filter((c) => (c.status ?? "published") === "published");
}
export function getCompetitorBySlug(slug: string): CompetitorPage | undefined {
  return getCompetitors().find((c) => c.slug === slug);
}
export function getPublishedCompetitorBySlug(slug: string): CompetitorPage | undefined {
  const c = getCompetitorBySlug(slug);
  return c && (c.status ?? "published") === "published" ? c : undefined;
}
export function createCompetitor(page: CompetitorPage): CompetitorPage {
  const items = getCompetitors();
  if (items.some((c) => c.slug === page.slug)) throw new ProgrammaticConflictError(page.slug);
  items.unshift(page);
  writeFile(COMPETITORS_FILE, items);
  return page;
}
export function updateCompetitor(slug: string, updates: Partial<CompetitorPage>): CompetitorPage {
  const items = getCompetitors();
  const idx = items.findIndex((c) => c.slug === slug);
  if (idx === -1) throw new ProgrammaticNotFoundError(slug);
  if (updates.slug && updates.slug !== slug && items.some((c) => c.slug === updates.slug)) {
    throw new ProgrammaticConflictError(updates.slug);
  }
  items[idx] = { ...items[idx], ...updates };
  writeFile(COMPETITORS_FILE, items);
  return items[idx];
}
export function deleteCompetitor(slug: string): void {
  const items = getCompetitors();
  const idx = items.findIndex((c) => c.slug === slug);
  if (idx === -1) throw new ProgrammaticNotFoundError(slug);
  items.splice(idx, 1);
  writeFile(COMPETITORS_FILE, items);
}
