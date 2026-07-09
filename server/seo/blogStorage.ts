import fs from "fs";
import path from "path";
import { db } from "../db";
import { blogArticlesTable, type BlogArticleRow } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { blogArticles as hardcodedArticles, type BlogArticle } from "./blogData";

const SEED_FILE = path.resolve(process.cwd(), "data/blog-articles.json");

export class BlogNotFoundError extends Error {
  readonly status = 404;
  constructor(slug: string) {
    super(`Article "${slug}" not found`);
  }
}

export class BlogConflictError extends Error {
  readonly status = 409;
  constructor(slug: string) {
    super(`An article with slug "${slug}" already exists`);
  }
}

function toBlogArticle(row: BlogArticleRow): BlogArticle {
  return {
    slug: row.slug,
    title: row.title,
    seoTitle: row.seoTitle ?? undefined,
    metaDescription: row.metaDescription,
    publishedDate: row.publishedDate,
    updatedDate: row.updatedDate,
    readingMinutes: row.readingMinutes,
    excerpt: row.excerpt,
    bodyHtml: row.bodyHtml,
  };
}

function loadSeedArticles(): BlogArticle[] {
  try {
    return JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as BlogArticle[];
  } catch (err) {
    console.error("[blogStorage] Failed to read data/blog-articles.json, seeding from hardcoded data:", err);
    return hardcodedArticles;
  }
}

let seeded = false;
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const existing = await db.select({ slug: blogArticlesTable.slug }).from(blogArticlesTable).limit(1);
  if (existing.length === 0) {
    const articles = loadSeedArticles();
    if (articles.length > 0) {
      const now = Date.now();
      await db
        .insert(blogArticlesTable)
        .values(
          articles.map((a, i) => ({
            slug: a.slug,
            title: a.title,
            seoTitle: a.seoTitle,
            metaDescription: a.metaDescription,
            publishedDate: a.publishedDate,
            updatedDate: a.updatedDate,
            readingMinutes: a.readingMinutes,
            excerpt: a.excerpt,
            bodyHtml: a.bodyHtml,
            createdAt: new Date(now - i * 1000),
          }))
        )
        .onConflictDoNothing();
    }
  }
  seeded = true;
}

export async function getArticles(): Promise<BlogArticle[]> {
  await ensureSeeded();
  const rows = await db.select().from(blogArticlesTable).orderBy(desc(blogArticlesTable.createdAt));
  return rows.map(toBlogArticle);
}

export async function getArticleBySlug(slug: string): Promise<BlogArticle | undefined> {
  await ensureSeeded();
  const [row] = await db.select().from(blogArticlesTable).where(eq(blogArticlesTable.slug, slug));
  return row ? toBlogArticle(row) : undefined;
}

export async function createArticle(article: BlogArticle): Promise<BlogArticle> {
  await ensureSeeded();
  const [existing] = await db.select().from(blogArticlesTable).where(eq(blogArticlesTable.slug, article.slug));
  if (existing) {
    throw new BlogConflictError(article.slug);
  }
  await db.insert(blogArticlesTable).values({ ...article });
  return article;
}

export async function updateArticle(slug: string, updates: Partial<BlogArticle>): Promise<BlogArticle> {
  await ensureSeeded();
  const [existing] = await db.select().from(blogArticlesTable).where(eq(blogArticlesTable.slug, slug));
  if (!existing) {
    throw new BlogNotFoundError(slug);
  }
  if (updates.slug && updates.slug !== slug) {
    const [conflict] = await db.select().from(blogArticlesTable).where(eq(blogArticlesTable.slug, updates.slug));
    if (conflict) throw new BlogConflictError(updates.slug);
  }
  const [updated] = await db
    .update(blogArticlesTable)
    .set(updates)
    .where(eq(blogArticlesTable.slug, slug))
    .returning();
  return toBlogArticle(updated);
}

export async function deleteArticle(slug: string): Promise<void> {
  await ensureSeeded();
  const result = await db
    .delete(blogArticlesTable)
    .where(eq(blogArticlesTable.slug, slug))
    .returning({ slug: blogArticlesTable.slug });
  if (result.length === 0) {
    throw new BlogNotFoundError(slug);
  }
}
