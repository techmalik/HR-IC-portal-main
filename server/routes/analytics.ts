import type { Express } from "express";
import { authMiddleware, requireRole, asyncHandler } from "./shared";

export function registerAnalyticsRoutes(app: Express): void {
  app.get(
    "/api/analytics/:section",
    authMiddleware,
    requireRole("admin", "owner"),
    asyncHandler(async (req, res) => {
      const { section } = req.params;
      const orgId = req.authenticatedUser!.organizationId ?? undefined;
      const {
        parseFilters,
        getSpend,
        getHours,
        getOvertime,
        getOOO,
        getSLA,
        getHeadcount,
        joinCSVTables,
      } = await import("../analytics");
      const filters = parseFilters(req.query as Record<string, unknown>);
      const format = (req.query.format as string) === "csv" ? "csv" : "json";

      const sendCSV = (filename: string, csv: string) => {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csv);
      };

      switch (section) {
        case "spend": {
          const data = await getSpend(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-spend.csv`,
              joinCSVTables([
                {
                  title: `Spend by month (native amounts, cents)`,
                  columns: ["month", "currency", "amount"],
                  rows: data.series,
                },
                {
                  title: `Spend by month (converted to ${data.displayCurrency}, cents)`,
                  columns: ["month", "amount"],
                  rows: data.convertedSeries,
                },
                {
                  title: `Totals by currency`,
                  columns: ["currency", "amount", "amountInDisplay"],
                  rows: data.totalsByCurrency,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "hours": {
          const data = await getHours(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-hours.csv`,
              joinCSVTables([
                {
                  title: "Hours per contractor",
                  columns: ["userId", "name", "team", "monthlyCap", "totalHours", "monthsCounted", "utilizationPct"],
                  rows: data.perIC,
                },
                {
                  title: "Hours per team",
                  columns: ["team", "totalHours", "contractors"],
                  rows: data.perTeam,
                },
                {
                  title: "Hours by month",
                  columns: ["month", "totalHours"],
                  rows: data.trend,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "overtime": {
          const data = await getOvertime(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-overtime.csv`,
              joinCSVTables([
                {
                  title: "Overtime per contractor",
                  columns: ["userId", "name", "team", "approvedHours", "pendingHours", "requests"],
                  rows: data.perIC,
                },
                {
                  title: "Overtime per team",
                  columns: ["team", "approvedHours", "pendingHours", "requests"],
                  rows: data.perTeam,
                },
                {
                  title: "Overtime by month",
                  columns: ["month", "approvedHours"],
                  rows: data.trend,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "ooo": {
          const data = await getOOO(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-ooo.csv`,
              joinCSVTables([
                {
                  title: "OOO per contractor",
                  columns: ["userId", "name", "team", "totalDays", "requests"],
                  rows: data.perIC,
                },
                {
                  title: "OOO per team",
                  columns: ["team", "totalDays", "contractors"],
                  rows: data.perTeam,
                },
                {
                  title: "OOO by month",
                  columns: ["month", "totalDays"],
                  rows: data.trend,
                },
                {
                  title: "Upcoming OOO (next 90 days)",
                  columns: ["userId", "name", "team", "startDate", "endDate", "oooType"],
                  rows: data.upcoming,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "sla": {
          const data = await getSLA(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-sla.csv`,
              joinCSVTables([
                {
                  title: "Approvals SLA",
                  columns: ["type", "label", "decided", "pending", "medianHours", "p90Hours", "avgHours"],
                  rows: data.buckets,
                },
              ])
            );
          }
          return res.json(data);
        }
        case "headcount": {
          const data = await getHeadcount(orgId, filters);
          if (format === "csv") {
            return sendCSV(
              `analytics-headcount.csv`,
              joinCSVTables([
                {
                  title: `Active contractors: ${data.activeContractors} of ${data.totalContractors}`,
                  columns: ["team", "count"],
                  rows: data.byTeam,
                },
                {
                  title: "By status",
                  columns: ["status", "count"],
                  rows: data.byStatus,
                },
                {
                  title: "Upcoming renewals (next 90 days)",
                  columns: ["contractId", "userId", "name", "title", "endDate", "daysToEnd"],
                  rows: data.upcomingRenewals,
                },
                {
                  title: "Contracts expired in range",
                  columns: ["contractId", "userId", "name", "title", "endDate"],
                  rows: data.expiredInRange,
                },
                {
                  title: "Churn",
                  columns: ["userId", "name", "team", "status"],
                  rows: data.churnUsers,
                },
              ])
            );
          }
          return res.json(data);
        }
        default:
          return res.status(404).json({ error: "Unknown analytics section" });
      }
    })
  );
}
