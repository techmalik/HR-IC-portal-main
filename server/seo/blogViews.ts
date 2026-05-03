import fs from "fs";
import path from "path";

const VIEWS_FILE = path.resolve(process.cwd(), "data/blog-views.json");

export interface ArticleViewStats {
  views: number;
  referrers: Record<string, number>;
}

export interface BlogViewsStore {
  [slug: string]: ArticleViewStats;
}

function readStore(): BlogViewsStore {
  try {
    if (!fs.existsSync(VIEWS_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(VIEWS_FILE, "utf8");
    return JSON.parse(raw) as BlogViewsStore;
  } catch {
    return {};
  }
}

function writeStore(store: BlogViewsStore): void {
  fs.mkdirSync(path.dirname(VIEWS_FILE), { recursive: true });
  fs.writeFileSync(VIEWS_FILE, JSON.stringify(store, null, 2), "utf8");
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

export function recordView(slug: string, refererHeader: string | undefined): void {
  try {
    const store = readStore();
    if (!store[slug]) {
      store[slug] = { views: 0, referrers: {} };
    }
    store[slug].views += 1;
    const source = classifyReferrer(refererHeader);
    store[slug].referrers[source] = (store[slug].referrers[source] ?? 0) + 1;
    writeStore(store);
  } catch (err) {
    console.error("[blogViews] Failed to record view:", err);
  }
}

export function getAllViewStats(): BlogViewsStore {
  return readStore();
}

export function getViewStats(slug: string): ArticleViewStats {
  const store = readStore();
  return store[slug] ?? { views: 0, referrers: {} };
}
