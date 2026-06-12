import { db } from "../db";
import { blogViews } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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
    // Upsert: increment view count and merge referrer into the jsonb map.
    await db.insert(blogViews)
      .values({
        slug,
        views: 1,
        referrers: { [source]: 1 } as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: blogViews.slug,
        set: {
          views: sql`${blogViews.views} + 1`,
          referrers: sql`jsonb_set(
            COALESCE(${blogViews.referrers}, '{}'::jsonb),
            array[${source}],
            to_jsonb(COALESCE((${blogViews.referrers}->>CAST(${source} AS text))::int, 0) + 1),
            true
          )`,
        },
      });
  } catch (err) {
    console.error("[blogViews] Failed to record view:", err);
  }
}

export async function getAllViewStats(): Promise<BlogViewsStore> {
  const rows = await db.select().from(blogViews);
  const store: BlogViewsStore = {};
  for (const r of rows) {
    store[r.slug] = {
      views: r.views,
      referrers: (r.referrers as unknown as Record<string, number>) ?? {},
    };
  }
  return store;
}

export async function getViewStats(slug: string): Promise<ArticleViewStats> {
  const result = await db.select().from(blogViews).where(eq(blogViews.slug, slug));
  if (!result[0]) return { views: 0, referrers: {} };
  return {
    views: result[0].views,
    referrers: (result[0].referrers as unknown as Record<string, number>) ?? {},
  };
}
