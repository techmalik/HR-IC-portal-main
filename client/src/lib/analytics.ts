// Lightweight client-side analytics. Events are stored in localStorage so we
// can measure adoption (PWA install, first submit) without standing up a
// dedicated analytics service. We dedupe "first" events per user/per day.
const KEY = "axle.analytics";
const FIRST_KEY = "axle.analytics.firsts";

// One-time migration from old key names (pre-rename).
if (typeof window !== "undefined") {
  try {
    const old = localStorage.getItem("teamflow.analytics");
    if (old !== null && localStorage.getItem(KEY) === null) localStorage.setItem(KEY, old);
    localStorage.removeItem("teamflow.analytics");
    const oldF = localStorage.getItem("teamflow.analytics.firsts");
    if (oldF !== null && localStorage.getItem(FIRST_KEY) === null) localStorage.setItem(FIRST_KEY, oldF);
    localStorage.removeItem("teamflow.analytics.firsts");
  } catch {}
}

export type AnalyticsEvent = {
  event: string;
  at: number;
  meta?: Record<string, unknown>;
};

function readEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AnalyticsEvent[]) {
  try {
    // Cap size so we never blow past localStorage quota.
    const trimmed = events.slice(-500);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function trackEvent(event: string, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const events = readEvents();
  events.push({ event, at: Date.now(), meta });
  writeEvents(events);
}

export function trackFirst(event: string, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(FIRST_KEY);
    const firsts: Record<string, number> = raw ? JSON.parse(raw) : {};
    if (firsts[event]) return;
    firsts[event] = Date.now();
    localStorage.setItem(FIRST_KEY, JSON.stringify(firsts));
    trackEvent(event, meta);
  } catch {}
}

export function getEvents(): AnalyticsEvent[] {
  return readEvents();
}
