import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve(process.cwd(), "data/email-subscribers.json");

export interface EmailSubscriber {
  email: string;
  subscribedAt: string;
  source: string;
}

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

export function getSubscribers(): EmailSubscriber[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as EmailSubscriber[];
  } catch {
    return [];
  }
}

function saveSubscribers(subscribers: EmailSubscriber[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(subscribers, null, 2), "utf8");
}

export function addSubscriber(email: string, source: string): { ok: boolean; alreadyExists: boolean } {
  const subscribers = getSubscribers();
  const normalized = email.trim().toLowerCase();
  if (subscribers.some((s) => s.email === normalized)) {
    return { ok: true, alreadyExists: true };
  }
  subscribers.push({ email: normalized, subscribedAt: new Date().toISOString(), source });
  saveSubscribers(subscribers);
  return { ok: true, alreadyExists: false };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
