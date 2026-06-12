import { db } from "../db";
import { blogArticles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { blogArticles as hardcodedArticles, type BlogArticle } from "./blogData";
export type { BlogArticle };

export class BlogNotFoundError extends Error {
  readonly status = 404;
  constructor(slug: string) {
    super(`Article "${slug}" not found`);
    this.name = "BlogNotFoundError";
  }
}

export class BlogConflictError extends Error {
  readonly status = 409;
  constructor(slug: string) {
    super(`An article with slug "${slug}" already exists`);
    this.name = "BlogConflictError";
  }
}

// Seed the DB from hardcoded defaults if the table is empty.
// Called lazily on first read so startup isn't blocked.
let seeded = false;
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    const existing = await db.select({ slug: blogArticles.slug }).from(blogArticles).limit(1);
    if (existing.length === 0 && hardcodedArticles.length > 0) {
      await db.insert(blogArticles).values(
        hardcodedArticles.map((a) => ({ slug: a.slug, data: a as unknown as Record<string, unknown> })),
      ).onConflictDoNothing();
    }
  } catch (err) {
    console.error("[blogStorage] Seed failed:", err);
  }
}

export async function getArticles(): Promise<BlogArticle[]> {
  await ensureSeeded();
  const rows = await db.select().from(blogArticles);
  return rows.map((r) => r.data as unknown as BlogArticle);
}

export async function getArticleBySlug(slug: string): Promise<BlogArticle | undefined> {
  await ensureSeeded();
  const result = await db.select().from(blogArticles).where(eq(blogArticles.slug, slug));
  return result[0] ? (result[0].data as unknown as BlogArticle) : undefined;
}

export async function createArticle(article: BlogArticle): Promise<BlogArticle> {
  const existing = await db.select({ slug: blogArticles.slug }).from(blogArticles).where(eq(blogArticles.slug, article.slug));
  if (existing.length > 0) throw new BlogConflictError(article.slug);
  await db.insert(blogArticles).values({ slug: article.slug, data: article as unknown as Record<string, unknown> });
  return article;
}

export async function updateArticle(slug: string, updates: Partial<BlogArticle>): Promise<BlogArticle> {
  const result = await db.select().from(blogArticles).where(eq(blogArticles.slug, slug));
  if (result.length === 0) throw new BlogNotFoundError(slug);
  const merged = { ...(result[0].data as unknown as BlogArticle), ...updates };
  await db.update(blogArticles).set({ data: merged as unknown as Record<string, unknown> }).where(eq(blogArticles.slug, slug));
  return merged;
}

export async function deleteArticle(slug: string): Promise<void> {
  const result = await db.delete(blogArticles).where(eq(blogArticles.slug, slug)).returning();
  if (result.length === 0) throw new BlogNotFoundError(slug);
}
