import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBulkBody, runBulk } from "../bulkReview.ts";

test("parseBulkBody rejects non-object body", () => {
  assert.equal(parseBulkBody(null), "Invalid request body");
  assert.equal(parseBulkBody(undefined), "Invalid request body");
  assert.equal(parseBulkBody("nope"), "Invalid request body");
});

test("parseBulkBody requires status to be approved or rejected", () => {
  assert.equal(
    parseBulkBody({ ids: ["a"], status: "foo" }),
    "status must be 'approved' or 'rejected'",
  );
  assert.equal(
    parseBulkBody({ ids: ["a"] }),
    "status must be 'approved' or 'rejected'",
  );
});

test("parseBulkBody requires non-empty ids array", () => {
  assert.equal(
    parseBulkBody({ status: "approved", ids: [] }),
    "ids must be a non-empty array",
  );
  assert.equal(
    parseBulkBody({ status: "approved", ids: "not-array" }),
    "ids must be a non-empty array",
  );
});

test("parseBulkBody enforces 200-item ceiling", () => {
  const ids = Array.from({ length: 201 }, (_, i) => `id-${i}`);
  assert.equal(
    parseBulkBody({ status: "approved", ids }),
    "Cannot process more than 200 items at once",
  );
});

test("parseBulkBody dedupes ids and clips reviewNote to 1000 chars", () => {
  const result = parseBulkBody({
    status: "rejected",
    ids: ["a", "a", "b"],
    reviewNote: "x".repeat(1500),
  });
  assert.notEqual(typeof result, "string");
  if (typeof result === "string") return;
  assert.deepEqual(result.ids.sort(), ["a", "b"]);
  assert.equal(result.status, "rejected");
  assert.equal(result.reviewNote?.length, 1000);
});

test("parseBulkBody case-normalizes status and treats empty note as null", () => {
  const result = parseBulkBody({
    status: "APPROVED",
    ids: ["a"],
    reviewNote: "",
  });
  assert.notEqual(typeof result, "string");
  if (typeof result === "string") return;
  assert.equal(result.status, "approved");
  assert.equal(result.reviewNote, null);
});

test("runBulk records every item with per-item success or error", async () => {
  const summary = await runBulk(["ok-1", "fail-1", "ok-2"], async (id) => {
    if (id.startsWith("fail")) throw new Error("nope");
  });
  assert.equal(summary.successCount, 2);
  assert.equal(summary.failureCount, 1);
  assert.equal(summary.results.length, 3);
  const failed = summary.results.find((r) => !r.success);
  assert.ok(failed);
  assert.equal(failed.id, "fail-1");
  assert.equal(failed.error, "nope");
});

test("runBulk does not abort on failure (partial-failure semantics)", async () => {
  const seen: string[] = [];
  const summary = await runBulk(["a", "b", "c"], async (id) => {
    seen.push(id);
    if (id === "a") throw new Error("boom");
  });
  // All items must be visited even though the first one failed.
  assert.deepEqual(seen, ["a", "b", "c"]);
  assert.equal(summary.successCount, 2);
  assert.equal(summary.failureCount, 1);
});

test("runBulk falls back to 'Failed' when error has no message", async () => {
  const summary = await runBulk(["x"], async () => {
    throw {};
  });
  assert.equal(summary.results[0].error, "Failed");
});
