import express, { type Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import helmet from "helmet";
import { logger } from "./logger";
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
import { sendRawEmail } from "./emailService";

const app = express();
// Trust the first proxy (Replit's load balancer) so req.ip reflects the real client IP
app.set("trust proxy", 1);

// Security headers. CSP is disabled in development because Vite HMR injects
// inline scripts that would be blocked by a strict policy.
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
  }),
);
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

// Note: /uploads static serving removed — files are served via authenticated
// /objects/* route through Replit Object Storage.

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Attach a short request ID to every request and reflect it in the response
// header so that client-side error reports can be correlated with server logs.
app.use((req: Request, res: Response, next: NextFunction) => {
  const id = randomUUID().slice(0, 8);
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const reqId = (req as Request & { requestId?: string }).requestId ?? "";

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.info(`${req.method} ${path}`, { status: res.statusCode, ms: duration, reqId });
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const reqId = (req as Request & { requestId?: string }).requestId ?? "";

    res.status(status).json({ message, requestId: reqId });
    if (status >= 500) {
      logger.error("Unhandled error", { reqId, status, message: err?.message, stack: err?.stack });
    }
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
          logger.error("Session cleanup error", { error: String(e) });
        }
      }, 60 * 60 * 1000);

      const checkExpiringContracts = async () => {
        try {
          const all = await storage.getAllContractsForScheduler();
          const now = Date.now();
          // Filter to contracts actually in the notice window before fetching users.
          const due = all.filter((c) => {
            if (c.noticeAlertSentAt) return false;
            const end = new Date(c.endDate).getTime();
            const noticeMs = (c.noticePeriodDays || 30) * 24 * 60 * 60 * 1000;
            return end >= now && end - now <= noticeMs;
          });
          if (due.length === 0) return;
          // Batch-load all needed users in one query instead of N getUser() calls.
          const userIds = Array.from(new Set(due.map((c) => c.userId)));
          const userList = await storage.getUsersByIds(userIds);
          const userMap = new Map(userList.map((u) => [u.id, u]));
          for (const c of due) {
            const contractor = userMap.get(c.userId);
            if (!contractor) continue;
            await notifyContractExpiring(c, contractor);
            await storage.updateContract(c.id, { noticeAlertSentAt: new Date() });
          }
        } catch (e) {
          logger.error("Contract renewal check error", { error: String(e) });
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

          // Batch-load all data upfront — O(3 queries) instead of O(N*2 queries).
          const [allUsers, timesheetsForPeriod, alreadyNotified] = await Promise.all([
            storage.getAllUsersForScheduler(),
            storage.getTimesheetsByMonth(targetMonth, targetYear),
            storage.getTimesheetRemindersSentForPeriod(periodKey),
          ]);

          const timesheetByUser = new Map(timesheetsForPeriod.map((ts) => [ts.userId, ts]));

          for (const u of allUsers) {
            if (!u.isActive || u.role !== "ic") continue;

            const inFlightKey = `${u.id}:${periodKey}`;
            if (reminderInFlight.has(inFlightKey)) continue;
            if (alreadyNotified.has(u.id)) continue;

            const ts = timesheetByUser.get(u.id);
            // Only nudge when the timesheet is missing or still a draft.
            if (ts && ts.status !== "draft") continue;

            reminderInFlight.add(inFlightKey);
            try {
              await notifyTimesheetReminder(u.id, targetMonth, targetYear);
            } catch (sendErr) {
              logger.error("Timesheet reminder send error", { error: String(sendErr) });
            } finally {
              reminderInFlight.delete(inFlightKey);
            }
          }
        } catch (e) {
          logger.error("Timesheet reminder check error", { error: String(e) });
        }
      };
      setTimeout(checkTimesheetReminders, 60 * 1000);
      setInterval(checkTimesheetReminders, 12 * 60 * 60 * 1000);

      // ── Email outbox worker (H13) ─────────────────────────────────────────
      // Processes pending outbox entries every 2 minutes, retrying failed sends
      // up to 5 times before marking them permanently failed.
      const MAX_EMAIL_ATTEMPTS = 5;
      const processEmailOutbox = async () => {
        try {
          const pending = await storage.getPendingEmailOutboxEntries(MAX_EMAIL_ATTEMPTS);
          for (const entry of pending) {
            const ok = await sendRawEmail(entry.toEmail, entry.subject, entry.htmlBody, entry.textBody);
            await storage.updateEmailOutboxEntry(entry.id, {
              attempts: entry.attempts + 1,
              lastAttemptedAt: new Date(),
              status: ok ? "sent" : entry.attempts + 1 >= MAX_EMAIL_ATTEMPTS ? "failed" : "pending",
              sentAt: ok ? new Date() : undefined,
            });
          }
        } catch (e) {
          logger.error("Email outbox worker error", { error: String(e) });
        }
      };
      setTimeout(processEmailOutbox, 5 * 1000);
      setInterval(processEmailOutbox, 2 * 60 * 1000);
    },
  );
})();
