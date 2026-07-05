/**
 * Production Database Reset Script
 *
 * Deletes ALL rows from every data table, leaving the schema intact.
 * This is a one-shot, irreversible operation — use it only when you
 * need to wipe test/seed data before onboarding real customers.
 *
 * HOW TO RUN (against the production database):
 *
 *   DATABASE_URL=<your-prod-db-url> npx tsx server/scripts/reset-production-db.ts --confirm
 *
 * The --confirm flag is required to prevent accidental runs.
 * Without it the script prints a warning and exits immediately.
 *
 * The script prints the row count deleted from each table so you can
 * verify the wipe was complete before going live.
 */

import { db } from "../db";
import {
  notifications,
  notificationPreferences,
  sessions,
  feedbackInvitations,
  evaluationSections,
  evaluations,
  icResponsibilities,
  icPaymentDetails,
  activityLogs,
  dailyEntries,
  overtimeRequests,
  timesheets,
  invoiceLineItems,
  expenses,
  invoices,
  contracts,
  oooRequests,
  users,
  subscriptions,
  organizations,
} from "../../shared/schema";
import { sql } from "drizzle-orm";

const CONFIRMED_FLAG = "--confirm";

async function countRows(tableName: string): Promise<number> {
  const result = await db.execute(sql`SELECT COUNT(*)::int AS n FROM ${sql.raw(tableName)}`);
  return (result.rows[0] as { n: number }).n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteAll(table: any, tableName: string): Promise<number> {
  const before = await countRows(tableName);
  await db.delete(table);
  const after = await countRows(tableName);
  const deleted = before - after;
  console.log(`  ${tableName.padEnd(30)} ${before} → ${after}  (deleted ${deleted})`);
  return deleted;
}

async function resetDatabase() {
  const confirmed = process.argv.includes(CONFIRMED_FLAG);

  if (!confirmed) {
    console.error("");
    console.error("⚠️  DESTRUCTIVE OPERATION — ALL DATA WILL BE DELETED");
    console.error("");
    console.error("  This script wipes every row from every data table.");
    console.error("  The database schema (tables, indexes, enums) is preserved.");
    console.error("  This CANNOT be undone without a backup.");
    console.error("");
    console.error("  To proceed, re-run with the --confirm flag:");
    console.error("");
    console.error("    DATABASE_URL=<prod-url> npx tsx server/scripts/reset-production-db.ts --confirm");
    console.error("");
    process.exit(1);
  }

  console.log("");
  console.log("🗑️  Starting production database reset...");
  console.log("   Deleting in dependency order (children before parents)");
  console.log("");
  console.log("  Table                          Before → After  (deleted)");
  console.log("  " + "-".repeat(60));

  let totalDeleted = 0;

  // Delete in dependency order: leaf tables first, root tables last.
  // Tables that reference users/organizations must come before those.
  totalDeleted += await deleteAll(notifications,           "notifications");
  totalDeleted += await deleteAll(notificationPreferences, "notification_preferences");
  totalDeleted += await deleteAll(sessions,                "sessions");
  totalDeleted += await deleteAll(feedbackInvitations,     "feedback_invitations");
  totalDeleted += await deleteAll(evaluationSections,      "evaluation_sections");
  totalDeleted += await deleteAll(evaluations,             "evaluations");
  totalDeleted += await deleteAll(icResponsibilities,      "ic_responsibilities");
  totalDeleted += await deleteAll(icPaymentDetails,        "ic_payment_details");
  totalDeleted += await deleteAll(activityLogs,            "activity_logs");
  totalDeleted += await deleteAll(dailyEntries,            "daily_entries");
  totalDeleted += await deleteAll(overtimeRequests,        "overtime_requests");
  totalDeleted += await deleteAll(timesheets,              "timesheets");
  totalDeleted += await deleteAll(invoiceLineItems,        "invoice_line_items");
  totalDeleted += await deleteAll(expenses,                "expenses");
  totalDeleted += await deleteAll(invoices,                "invoices");
  totalDeleted += await deleteAll(contracts,               "contracts");
  totalDeleted += await deleteAll(oooRequests,             "ooo_requests");
  totalDeleted += await deleteAll(users,                   "users");
  totalDeleted += await deleteAll(subscriptions,           "subscriptions");
  totalDeleted += await deleteAll(organizations,           "organizations");

  console.log("  " + "-".repeat(60));
  console.log(`  ${"TOTAL".padEnd(30)} ${totalDeleted} rows deleted`);
  console.log("");
  console.log("✅  Database reset complete. All tables are empty.");
  console.log("   You can now onboard real customers.");
  console.log("");
}

resetDatabase().catch((err) => {
  console.error("❌  Reset failed:", err);
  process.exit(1);
});
