import { randomUUID } from "crypto";

export const ALLOWED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "MXN", "BRL", "INR", "JPY",
  "CHF", "SEK", "NOK", "PLN", "ZAR", "ARS", "COP", "PHP", "SGD",
]);

export function normalizeCurrencyInput(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  return ALLOWED_CURRENCIES.has(upper) ? upper : undefined;
}

export function normalizeFileUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("data:")) return fileUrl;
  if (fileUrl.startsWith("/")) return fileUrl;
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    try {
      return new URL(fileUrl).pathname;
    } catch {
      return fileUrl;
    }
  }
  return fileUrl;
}

export async function uploadBase64ToObjectStorage(
  base64DataUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error("[ObjectStorage] Invalid base64 data URL format");
      return null;
    }
    const buffer = Buffer.from(matches[2], "base64");
    const { Client } = await import("@replit/object-storage");
    const storageClient = new Client();
    const objectId = randomUUID();
    const storagePath = `.private/uploads/${objectId}`;
    const uploadResult = await storageClient.uploadFromBytes(storagePath, buffer);
    if (!uploadResult.ok) {
      console.error("[ObjectStorage] Failed to upload file:", uploadResult.error);
      return null;
    }
    const objectPath = `/objects/uploads/${objectId}`;
    console.log(`[ObjectStorage] Uploaded ${fileName} to ${objectPath}`);
    return objectPath;
  } catch (error: any) {
    console.error("[ObjectStorage] Upload error:", error?.message || error);
    return null;
  }
}

export function isWeekend(dateString: string): boolean {
  const date = new Date(dateString);
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}
