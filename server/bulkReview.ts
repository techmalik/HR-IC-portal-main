export type BulkItemResult = { id: string; success: boolean; error?: string };
export type BulkResponse = {
  results: BulkItemResult[];
  successCount: number;
  failureCount: number;
};

export type ParsedBulkBody = {
  ids: string[];
  status: "approved" | "rejected";
  reviewNote: string | null;
};

export function parseBulkBody(body: any): ParsedBulkBody | string {
  if (!body || typeof body !== "object") return "Invalid request body";
  const status = String(body.status || "").toLowerCase();
  if (status !== "approved" && status !== "rejected") {
    return "status must be 'approved' or 'rejected'";
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return "ids must be a non-empty array";
  }
  if (body.ids.length > 200) {
    return "Cannot process more than 200 items at once";
  }
  const ids: string[] = Array.from(
    new Set((body.ids as unknown[]).map((v) => String(v))),
  );
  const reviewNote = body.reviewNote
    ? String(body.reviewNote).slice(0, 1000)
    : null;
  return { ids, status: status as "approved" | "rejected", reviewNote };
}

/**
 * Process each id with the given handler. Failures are non-fatal; the per-item
 * error message is captured and returned alongside successes.
 */
export async function runBulk(
  ids: string[],
  handler: (id: string) => Promise<void>,
): Promise<BulkResponse> {
  const results: BulkItemResult[] = [];
  for (const id of ids) {
    try {
      await handler(id);
      results.push({ id, success: true });
    } catch (e: any) {
      results.push({ id, success: false, error: e?.message || "Failed" });
    }
  }
  return {
    results,
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length,
  };
}
