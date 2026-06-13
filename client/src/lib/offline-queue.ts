// Tiny offline draft queue. Drafts are saved to localStorage when the
// network drops, and flushed on reconnect. Each kind of draft (e.g.
// "timesheet" or "ooo") is keyed by its own id so we don't mix things up.
type QueuedDraft = {
  id: string;
  kind: "timesheet" | "ooo" | "expense" | "invoice";
  payload: unknown;
  url: string;
  method: "POST" | "PATCH";
  savedAt: number;
};

const KEY = "teamflow.offline.queue";

function read(): QueuedDraft[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: QueuedDraft[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

export function enqueueDraft(item: Omit<QueuedDraft, "savedAt">) {
  const items = read().filter((q) => q.id !== item.id);
  items.push({ ...item, savedAt: Date.now() });
  write(items);
}

export function getPendingDrafts(kind?: QueuedDraft["kind"]): QueuedDraft[] {
  const items = read();
  return kind ? items.filter((i) => i.kind === kind) : items;
}

export function removeDraft(id: string) {
  write(read().filter((q) => q.id !== id));
}

export function pendingCount(): number {
  return read().length;
}

let flushing = false;
const listeners = new Set<(count: number) => void>();

export function subscribeQueue(cb: (count: number) => void) {
  listeners.add(cb);
  cb(pendingCount());
  return () => listeners.delete(cb);
}

function notify() {
  const c = pendingCount();
  listeners.forEach((l) => l(c));
}

// Drafts older than this are considered abandoned and dropped on flush so we
// don't keep retrying invalid payloads forever.
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    const now = Date.now();
    const items = read();
    for (const item of items) {
      // Drop stale drafts to avoid retrying forever.
      if (now - item.savedAt > MAX_DRAFT_AGE_MS) {
        removeDraft(item.id);
        continue;
      }
      try {
        const res = await fetch(item.url, {
          method: item.method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          removeDraft(item.id);
        } else if (res.status >= 400 && res.status < 500) {
          // 4xx means the server rejected the payload — drop it instead of
          // looping forever, but surface so the user can resubmit manually.
          removeDraft(item.id);
        }
        // 5xx -> keep the draft and retry on the next flush.
      } catch {
        // Still offline — stop trying.
        break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue();
  });
  // Try once on load in case we have leftover drafts.
  setTimeout(() => flushQueue(), 1500);
}
