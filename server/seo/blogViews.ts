import { db } from "../db";
import { blogViewStats } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ArticleViewStats {
  views: number;
  referrers: Record<string, number>;
}

export interface BlogViewsStore {
  [slug: string]: ArticleViewStats;
}

export function classifyReferrer(refererHeader: string | undefined): string {
  if (!refererHeader) return "Direct";
  const r = refererHeader.toLowerCase();
  if (r.includes("google.")) return "Google";
  if (r.includes("bing.")) return "Bing";
  if (r.includes("yahoo.")) return "Yahoo";
  if (r.includes("duckduckgo.")) return "DuckDuckGo";
  if (r.includes("twitter.") || r.includes("t.co")) return "Twitter / X";
  if (r.includes("facebook.") || r.includes("fb.com")) return "Facebook";
  if (r.includes("linkedin.")) return "LinkedIn";
  if (r.includes("reddit.")) return "Reddit";
  try {
    const url = new URL(refererHeader);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Other";
  }
}

export async function recordView(slug: string, refererHeader: string | undefined): Promise<void> {
  try {
    const source = classifyReferrer(refererHeader);
    const [existing] = await db.select().from(blogViewStats).where(eq(blogViewStats.slug, slug));
    if (existing) {
      const referrers = { ...(existing.referrers as Record<string, number>) };
      referrers[source] = (referrers[source] ?? 0) + 1;
      await db
        .update(blogViewStats)
        .set({ views: existing.views + 1, referrers })
        .where(eq(blogViewStats.slug, slug));
    } else {
      await db
        .insert(blogViewStats)
        .values({ slug, views: 1, referrers: { [source]: 1 } })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error("[blogViews] Failed to record view:", err);
  }
}

export async function getAllViewStats(): Promise<BlogViewsStore> {
  const rows = await db.select().from(blogViewStats);
  const store: BlogViewsStore = {};
  for (const row of rows) {
    store[row.slug] = { views: row.views, referrers: row.referrers as Record<string, number> };
  }
  return store;
}

export async function getViewStats(slug: string): Promise<ArticleViewStats> {
  const [row] = await db.select().from(blogViewStats).where(eq(blogViewStats.slug, slug));
  return row ? { views: row.views, referrers: row.referrers as Record<string, number> } : { views: 0, referrers: {} };
}
