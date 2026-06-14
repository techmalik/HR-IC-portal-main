import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { createMigrateFilesRouter } from "./migrate-files";
import { registerAuthRoutes } from "./routes/auth";
import { registerBillingRoutes } from "./routes/billing";
import { registerContractRoutes } from "./routes/contracts";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerOooRoutes } from "./routes/ooo";
import { registerOvertimeRoutes } from "./routes/overtime";
import { registerExpensesRoutes } from "./routes/expenses";
import { registerTimesheetRoutes } from "./routes/timesheets";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerEvaluationRoutes } from "./routes/evaluations";
import { registerUserRoutes } from "./routes/users";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerSeoRoutes } from "./routes/seo";
import {
  authMiddleware,
  requireRole,
} from "./routes/shared";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check — no auth, no DB round-trip
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  // File serving and migration utilities
  registerObjectStorageRoutes(app, authMiddleware, storage);
  app.use(createMigrateFilesRouter(authMiddleware, requireRole("admin")));

  // Auth routes (login, register, logout, forgot-password, reset-password, me)
  registerAuthRoutes(app);

  // Domain route modules
  registerBillingRoutes(app);
  registerContractRoutes(app);
  registerNotificationRoutes(app);
  registerOooRoutes(app);
  registerOvertimeRoutes(app);
  registerExpensesRoutes(app);
  registerTimesheetRoutes(app);
  registerInvoiceRoutes(app);
  registerEvaluationRoutes(app);
  registerUserRoutes(app);
  registerAnalyticsRoutes(app);

  // SEO / public content routes must be registered BEFORE the SPA catch-all
  // so that Googlebot receives fully server-rendered HTML.
  await registerSeoRoutes(app);

  return httpServer;
}
