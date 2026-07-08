import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { registerWebSocketClient, unregisterWebSocketClient } from "./notificationService";
import { getUserIdFromToken, cleanupExpiredSessions } from "./sessionManager";
import { storage } from "./storage";
import { notifyContractExpiring, notifyTimesheetReminder, timesheetReminderPeriodKey } from "./notificationService";

const app = express();
const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", async (ws: WebSocket, req) => {
  const cookieHeader = req.headers.cookie || "";
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  if (!token) {
    ws.close(4001, "Missing session token");
    return;
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    ws.close(4002, "Invalid or expired session");
    return;
  }
  
  registerWebSocketClient(userId, ws as any);
  
  ws.on("close", () => {
    unregisterWebSocketClient(userId, ws as any);
  });
  
  ws.on("error", () => {
    unregisterWebSocketClient(userId, ws as any);
  });
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(cookieParser());

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Subdomain-aware routing — production only.
  // In dev/preview (localhost or Replit preview URL) every request passes through unchanged.
  if (process.env.NODE_ENV === "production") {
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      const hostname = req.hostname;
      const isAppSubdomain = hostname === "app.axlehq.app";
      const isMarketingDomain = hostname === "axlehq.app" || hostname === "www.axlehq.app";

      // Unknown host (Replit preview URL, custom domains, etc.) — pass through untouched.
      if (!isAppSubdomain && !isMarketingDomain) {
        return next();
      }

      if (isMarketingDomain) {
        // On the marketing domain only public paths are allowed.
        const p = req.path;
        const isPublic =
          p === "/" ||
          p === "/login" ||
          p === "/signup" ||
          p === "/competitive-analysis" ||
          p.startsWith("/blog") ||
          p.startsWith("/seo") ||
          p.startsWith("/api/auth/") ||
          p.startsWith("/api/blog/") ||
          p === "/api/billing/detect-currency" ||
          p === "/api/health" ||
          p.startsWith("/api/support/") ||
          p.startsWith("/objects/") ||
          p.startsWith("/assets/") ||
          p.startsWith("/uploads/") ||
          p === "/favicon.ico";

        if (!isPublic) {
          return res.redirect(302, "https://axlehq.app/");
        }
        return next();
      }

      if (isAppSubdomain) {
        // On the app subdomain, unauthenticated HTML navigations redirect to login.
        const p = req.path;
        const isApiRequest = p.startsWith("/api/");
        const isStaticAsset =
          p.startsWith("/assets/") ||
          p.startsWith("/objects/") ||
          p.startsWith("/uploads/") ||
          p === "/favicon.ico" ||
          /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|map)$/.test(p);

        if (!isApiRequest && !isStaticAsset) {
          const token = req.cookies?.session_token;
          if (!token) {
            return res.redirect(302, "https://axlehq.app/login");
          }
          const userId = await getUserIdFromToken(token);
          if (!userId) {
            return res.redirect(302, "https://axlehq.app/login");
          }
        }
        return next();
      }

      next();
    });
  }

  await registerRoutes(httpServer, app);

  // Backfill trialEndsAt for existing free-plan orgs that predate the trial column.
  // Sets to now + 7 days so they get a grace period before the trial enforcement kicks in.
  try {
    const { db: dbInstance } = await import("./db");
    const { subscriptions: subTable } = await import("@shared/schema");
    const { eq, isNull, and } = await import("drizzle-orm");
    const freeOrgs = await dbInstance.select().from(subTable).where(
      and(eq(subTable.plan, "free"), isNull(subTable.trialEndsAt))
    );
    if (freeOrgs.length > 0) {
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + 7);
      for (const sub of freeOrgs) {
        await dbInstance.update(subTable).set({ trialEndsAt: graceEnd }).where(eq(subTable.id, sub.id));
      }
      log(`[trial-migration] Set trialEndsAt for ${freeOrgs.length} existing free-plan org(s)`);
    }
  } catch (e: any) {
    log(`[trial-migration] Warning: could not backfill trialEndsAt — ${e?.message}`);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      setInterval(async () => {
        try {
          await cleanupExpiredSessions();
        } catch (e) {
          console.error("Session cleanup error:", e);
        }
      }, 60 * 60 * 1000);

      const checkExpiringContracts = async () => {
        try {
          const all = await storage.getAllContracts();
          const now = Date.now();
          for (const c of all) {
            const end = new Date(c.endDate).getTime();
            const noticeMs = (c.noticePeriodDays || 30) * 24 * 60 * 60 * 1000;
            const inWindow = end >= now && end - now <= noticeMs;
            if (!inWindow) continue;
            if (c.noticeAlertSentAt) continue;
            const contractor = await storage.getUser(c.userId);
            if (!contractor) continue;
            await notifyContractExpiring(c, contractor);
            await storage.updateContract(c.id, { noticeAlertSentAt: new Date() });
          }
        } catch (e) {
          console.error("Contract renewal check error:", e);
        }
      };
      setTimeout(checkExpiringContracts, 30 * 1000);
      setInterval(checkExpiringContracts, 24 * 60 * 60 * 1000);

      // Timesheet submission reminder: warn ICs whose timesheet for the
      // target period is missing or still in draft. Idempotency is keyed on
      // (userId, type, entityId=period key) so each (user, period) only ever
      // gets one reminder, even across restarts and concurrent scheduler runs.
      // A process-local in-flight set guards against overlapping runs in the
      // same instance; the createNotification path is wrapped in a
      // try/catch and tolerates duplicate-key errors at the DB layer.
      const reminderInFlight = new Set<string>();
      const checkTimesheetReminders = async () => {
        try {
          const now = new Date();
          const day = now.getUTCDate();
          const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
          const inEndOfMonth = day >= lastDay - 6;
          const inGracePeriod = day <= 5;
          if (!inEndOfMonth && !inGracePeriod) return;

          let targetMonth: number;
          let targetYear: number;
          if (inGracePeriod) {
            const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
            targetMonth = prev.getUTCMonth() + 1;
            targetYear = prev.getUTCFullYear();
          } else {
            targetMonth = now.getUTCMonth() + 1;
            targetYear = now.getUTCFullYear();
          }
          const periodKey = timesheetReminderPeriodKey(targetMonth, targetYear);

          const allUsers = await storage.getAllUsers();
          for (const u of allUsers) {
            if (!u.isActive || u.role !== "ic") continue;

            const inFlightKey = `${u.id}:${periodKey}`;
            if (reminderInFlight.has(inFlightKey)) continue;

            const ts = await storage.getTimesheetByUserAndMonth(u.id, targetMonth, targetYear);
            // Only nudge when the timesheet is missing or still a draft.
            // Skip submitted/approved/rejected — rejected has its own notification.
            if (ts && ts.status !== "draft") continue;

            // Idempotency: look up any prior reminder for this exact period
            // via the period key stored in entityId. This survives restarts
            // (unlike a process-local set) and is period-specific.
            const existing = await storage.getNotificationsByUser(u.id);
            const already = existing.some(n =>
              n.type === "timesheet_reminder"
              && n.entityType === "timesheet"
              && n.entityId === periodKey
            );
            if (already) continue;

            reminderInFlight.add(inFlightKey);
            try {
              await notifyTimesheetReminder(u.id, targetMonth, targetYear);
            } catch (sendErr) {
              console.error("Timesheet reminder send error:", sendErr);
            } finally {
              reminderInFlight.delete(inFlightKey);
            }
          }
        } catch (e) {
          console.error("Timesheet reminder check error:", e);
        }
      };
      setTimeout(checkTimesheetReminders, 60 * 1000);
      setInterval(checkTimesheetReminders, 12 * 60 * 60 * 1000);

      // Scheduled-downgrade check: when subscription.not_renew fires we store
      // scheduledDowngradeAt. Once that date passes we revert the org to free.
      const checkScheduledDowngrades = async () => {
        try {
          const now = new Date();
          const { db } = await import("./db");
          const { subscriptions, PLAN_LIMITS } = await import("@shared/schema");
          const { lte } = await import("drizzle-orm");
          const pending = await db
            .select()
            .from(subscriptions)
            .where(
              lte(subscriptions.scheduledDowngradeAt, now),
            );
          for (const sub of pending) {
            if (!sub.scheduledDowngradeAt) continue;
            if (sub.plan === "free") continue;
            await storage.updateSubscription(sub.id, {
              plan: "free",
              status: "active",
              maxSeats: PLAN_LIMITS.free.maxSeats,
              paystackSubscriptionCode: null,
              scheduledDowngradeAt: null,
              updatedAt: new Date(),
            });
            log(`[billing] Downgraded org ${sub.organizationId} to free (scheduled downgrade)`);

            // Notify admins + owners that the plan has reverted to free
            try {
              const [admins, owners] = await Promise.all([
                storage.getUsersByRole("admin", sub.organizationId),
                storage.getUsersByRole("owner", sub.organizationId),
              ]);
              const recipients = new Map<string, (typeof admins)[0]>();
              [...admins, ...owners].forEach(u => recipients.set(u.id, u));
              const { createNotification } = await import("./notificationService");
            for (const u of recipients.values()) {
                await createNotification(u.id, {
                  type: "subscription_plan_changed",
                  title: "Subscription Downgraded to Free",
                  message:
                    "Your Axle subscription period has ended and your account has been moved to the Free plan.",
                  entityType: "subscription",
                  entityId: sub.id,
                });
              }
            } catch (notifyErr) {
              console.error("[billing] downgrade notification error:", notifyErr);
            }
          }
        } catch (e) {
          console.error("Scheduled downgrade check error:", e);
        }
      };
      setTimeout(checkScheduledDowngrades, 5 * 60 * 1000);
      setInterval(checkScheduledDowngrades, 6 * 60 * 60 * 1000);
    },
  );
})();
