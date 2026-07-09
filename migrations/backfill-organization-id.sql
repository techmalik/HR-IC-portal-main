-- P3-2: backfill organization_id before it becomes NOT NULL.
--
-- Run this against the production database BEFORE `npm run db:push` applies
-- the schema in shared/schema.ts (which adds NOT NULL on organization_id for
-- the tables below). db:push will fail loudly if any row is still NULL after
-- this runs — that's intentional, it means a row couldn't be attributed to an
-- org and needs manual triage (see the final SELECT).
--
-- Order matters: child tables are backfilled from the parent row they
-- reference, so parents must be backfilled first.

-- Tables backfilled directly from the owning user's organization_id.
UPDATE contracts t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE expenses t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE ooo_requests t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE timesheets t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE overtime_requests t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE invoices t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE ic_payment_details t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE ic_responsibilities t SET organization_id = u.organization_id
  FROM users u WHERE t.ic_id = u.id AND t.organization_id IS NULL;

UPDATE evaluations t SET organization_id = u.organization_id
  FROM users u WHERE t.ic_id = u.id AND t.organization_id IS NULL;

UPDATE activity_logs t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE notifications t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE notification_preferences t SET organization_id = u.organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

-- Child tables backfilled from the parent row (must run after the parent
-- table's UPDATE above).
UPDATE daily_entries t SET organization_id = ts.organization_id
  FROM timesheets ts WHERE t.timesheet_id = ts.id AND t.organization_id IS NULL;

UPDATE invoice_line_items t SET organization_id = inv.organization_id
  FROM invoices inv WHERE t.invoice_id = inv.id AND t.organization_id IS NULL;

UPDATE evaluation_sections t SET organization_id = e.organization_id
  FROM evaluations e WHERE t.evaluation_id = e.id AND t.organization_id IS NULL;

UPDATE feedback_invitations t SET organization_id = e.organization_id
  FROM evaluations e WHERE t.evaluation_id = e.id AND t.organization_id IS NULL;

-- Sanity check: any row still NULL here belongs to a user/parent that itself
-- has no organization_id (e.g. an orphaned or platform-admin-only account).
-- Triage these manually (assign an org or delete the row) before db:push —
-- it will reject the migration otherwise.
SELECT 'contracts' AS table_name, count(*) FROM contracts WHERE organization_id IS NULL
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE organization_id IS NULL
UNION ALL SELECT 'ooo_requests', count(*) FROM ooo_requests WHERE organization_id IS NULL
UNION ALL SELECT 'timesheets', count(*) FROM timesheets WHERE organization_id IS NULL
UNION ALL SELECT 'daily_entries', count(*) FROM daily_entries WHERE organization_id IS NULL
UNION ALL SELECT 'overtime_requests', count(*) FROM overtime_requests WHERE organization_id IS NULL
UNION ALL SELECT 'invoices', count(*) FROM invoices WHERE organization_id IS NULL
UNION ALL SELECT 'invoice_line_items', count(*) FROM invoice_line_items WHERE organization_id IS NULL
UNION ALL SELECT 'ic_payment_details', count(*) FROM ic_payment_details WHERE organization_id IS NULL
UNION ALL SELECT 'ic_responsibilities', count(*) FROM ic_responsibilities WHERE organization_id IS NULL
UNION ALL SELECT 'evaluations', count(*) FROM evaluations WHERE organization_id IS NULL
UNION ALL SELECT 'evaluation_sections', count(*) FROM evaluation_sections WHERE organization_id IS NULL
UNION ALL SELECT 'feedback_invitations', count(*) FROM feedback_invitations WHERE organization_id IS NULL
UNION ALL SELECT 'activity_logs', count(*) FROM activity_logs WHERE organization_id IS NULL
UNION ALL SELECT 'notifications', count(*) FROM notifications WHERE organization_id IS NULL
UNION ALL SELECT 'notification_preferences', count(*) FROM notification_preferences WHERE organization_id IS NULL;
