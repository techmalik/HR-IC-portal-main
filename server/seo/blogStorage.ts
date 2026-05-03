import fs from "fs";
import path from "path";
import { blogArticles as hardcodedArticles, type BlogArticle } from "./blogData";

const DATA_FILE = path.resolve(process.cwd(), "data/blog-articles.json");

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

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(hardcodedArticles, null, 2), "utf8");
    console.log("[blogStorage] Initialized data/blog-articles.json from hardcoded data");
  }
}

export function getArticles(): BlogArticle[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as BlogArticle[];
  } catch (err) {
    console.error("[blogStorage] Failed to read blog-articles.json, using hardcoded data:", err);
    return hardcodedArticles;
  }
}

export function saveArticles(articles: BlogArticle[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), "utf8");
}

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return getArticles().find((a) => a.slug === slug);
}

export function createArticle(article: BlogArticle): BlogArticle {
  const articles = getArticles();
  if (articles.some((a) => a.slug === article.slug)) {
    throw new BlogConflictError(article.slug);
  }
  articles.unshift(article);
  saveArticles(articles);
  return article;
}

export function updateArticle(slug: string, updates: Partial<BlogArticle>): BlogArticle {
  const articles = getArticles();
  const idx = articles.findIndex((a) => a.slug === slug);
  if (idx === -1) {
    throw new BlogNotFoundError(slug);
  }
  if (updates.slug && updates.slug !== slug && articles.some((a) => a.slug === updates.slug)) {
    throw new BlogConflictError(updates.slug);
  }
  articles[idx] = { ...articles[idx], ...updates };
  saveArticles(articles);
  return articles[idx];
}

export function deleteArticle(slug: string): void {
  const articles = getArticles();
  const idx = articles.findIndex((a) => a.slug === slug);
  if (idx === -1) {
    throw new BlogNotFoundError(slug);
  }
  articles.splice(idx, 1);
  saveArticles(articles);
}
