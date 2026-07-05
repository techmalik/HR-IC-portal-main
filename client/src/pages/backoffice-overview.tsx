import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice-layout";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PlanBreakdownItem {
  plan: string;
  count: number;
  mrr: number;
}

interface RecentSignup {
  id: string;
  name: string;
  plan: string;
  userCount: number;
  createdAt: string;
}

interface MonthlyMrrItem {
  label: string;
  year: number;
  month: number;
  mrr: number;
}

interface BackofficeMetrics {
  orgCount: number;
  userCount: number;
  mrr: number;
  planBreakdown: PlanBreakdownItem[];
  recentSignups: RecentSignup[];
  monthlyMrr: MonthlyMrrItem[];
}

interface HealthStatus {
  status: "ok" | "degraded";
  services: {
    database: "ok" | "error";
    storage: "ok" | "error";
  };
  timestamp: string;
}

function planPillClass(plan: string) {
  switch (plan.toLowerCase()) {
    case "enterprise":
      return "bg-[#111827] text-white";
    case "pro":
      return "bg-[#059669] text-white";
    case "starter":
      return "bg-[#F3F4F6] text-[#374151]";
    default:
      return "bg-[#F3F4F6] text-[#9CA3AF]";
  }
}

function planDisplayName(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

const PLAN_ORDER = ["enterprise", "pro", "starter", "free"];
const PLAN_COLORS: Record<string, string> = {
  enterprise: "#111827",
  pro: "#059669",
  starter: "#34D399",
  free: "#D1FAE5",
};
const PLAN_DETAIL: Record<string, string> = {
  enterprise: "custom",
  pro: "$79/mo",
  starter: "$29/mo",
  free: "$0 MRR",
};

function KpiSkeleton() {
  return (
    <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[11px] px-4 py-[14px] animate-pulse">
      <div className="h-2 w-16 bg-[#F3F4F6] rounded mb-[14px]" />
      <div className="h-7 w-20 bg-[#F3F4F6] rounded mb-2" />
      <div className="h-2 w-24 bg-[#F3F4F6] rounded" />
    </div>
  );
}

export default function BackofficeOverviewPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<BackofficeMetrics>({
    queryKey: ["/api/backoffice/metrics"],
    staleTime: 30_000,
  });

  const { data: health, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ["/api/health"],
    staleTime: 30_000,
    retry: false,
  });

  const mrrFormatted = metrics
    ? `$${metrics.mrr.toLocaleString()}`
    : "—";

  const sortedPlanBreakdown = metrics
    ? [...metrics.planBreakdown].sort(
        (a, b) =>
          PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan)
      )
    : [];

  const totalOrgs = metrics?.orgCount ?? 0;

  const maxMonthMrr = metrics
    ? Math.max(...metrics.monthlyMrr.map((m) => m.mrr), 1)
    : 1;

  const systemServices = health
    ? [
        { label: "Database", ok: health.services.database === "ok" },
        { label: "File storage", ok: health.services.storage === "ok" },
        { label: "API", ok: health.status === "ok" },
      ]
    : [];

  return (
    <BackofficeLayout
      title="Platform Overview"
      actions={
        <>
          <div className="flex items-center gap-[5px] border-[1.5px] border-[#E5E7EB] rounded-[7px] px-3 py-[6px] bg-[#F9FAFB] text-[12.5px] text-[#6B7280]">
            <Calendar className="w-3 h-3 text-[#9CA3AF]" />
            Last 30 days
            <ChevronDown className="w-[11px] h-[11px] text-[#9CA3AF]" />
          </div>
          {!healthLoading && health && (
            <>
              <div
                className={`w-2 h-2 rounded-full ${
                  health.status === "ok" ? "bg-[#10B981]" : "bg-[#D97706]"
                }`}
              />
              <span className="text-[12px] text-[#6B7280]">
                {health.status === "ok" ? "All systems operational" : "Degraded"}
              </span>
            </>
          )}
        </>
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {metricsLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div
              className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[11px] px-4 py-[14px]"
              data-testid="card-kpi-mrr"
            >
              <div className="text-[9.5px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase mb-[10px]">
                MRR
              </div>
              <div className="text-[26px] font-bold text-[#111827] tracking-[-0.03em] tabular-nums">
                {mrrFormatted}
              </div>
              <div className="text-[11.5px] font-medium mt-1 text-[#6B7280]">
                from active subscriptions
              </div>
            </div>
            <div
              className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[11px] px-4 py-[14px]"
              data-testid="card-kpi-active-tenants"
            >
              <div className="text-[9.5px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase mb-[10px]">
                Active tenants
              </div>
              <div className="text-[26px] font-bold text-[#111827] tracking-[-0.03em] tabular-nums">
                {metrics?.orgCount ?? "—"}
              </div>
              <div className="text-[11.5px] font-medium mt-1 text-[#6B7280]">
                organizations
              </div>
            </div>
            <div
              className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[11px] px-4 py-[14px]"
              data-testid="card-kpi-total-users"
            >
              <div className="text-[9.5px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase mb-[10px]">
                Total users
              </div>
              <div className="text-[26px] font-bold text-[#111827] tracking-[-0.03em] tabular-nums">
                {metrics?.userCount ?? "—"}
              </div>
              <div className="text-[11.5px] font-medium mt-1 text-[#6B7280]">
                across all tenants
              </div>
            </div>
            <div
              className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[11px] px-4 py-[14px]"
              data-testid="card-kpi-paid-orgs"
            >
              <div className="text-[9.5px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase mb-[10px]">
                Paid tenants
              </div>
              <div className="text-[26px] font-bold text-[#111827] tracking-[-0.03em] tabular-nums">
                {metrics
                  ? metrics.planBreakdown
                      .filter((p) => p.plan !== "free")
                      .reduce((sum, p) => sum + p.count, 0)
                  : "—"}
              </div>
              <div className="text-[11.5px] font-medium mt-1 text-[#6B7280]">
                starter + pro + enterprise
              </div>
            </div>
          </>
        )}
      </div>

      {/* MRR chart + plan breakdown */}
      <div className="grid grid-cols-[1fr_280px] gap-[14px]">
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl px-[22px] py-[18px]">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[13.5px] font-semibold text-[#111827]">
                Monthly recurring revenue
              </div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">Cumulative MRR · past 6 months</div>
            </div>
            <span className="text-[13px] font-semibold text-[#059669]">{mrrFormatted}</span>
          </div>
          {metricsLoading ? (
            <div className="flex items-end gap-[10px] h-[120px] pb-6 border-b border-[#F3F4F6] animate-pulse">
              {[60, 45, 70, 55, 80, 90].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-t bg-[#F3F4F6]" style={{ height: `${h}px` }} />
                  <div className="h-2 w-6 bg-[#F3F4F6] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-[10px] h-[120px] pb-6 border-b border-[#F3F4F6]">
              {metrics?.monthlyMrr.map((bar, idx) => {
                const pct = maxMonthMrr > 0 ? (bar.mrr / maxMonthMrr) : 0;
                const heightPx = Math.max(pct * 96, bar.mrr > 0 ? 8 : 4);
                const isLast = idx === (metrics.monthlyMrr.length - 1);
                const GREENS = ["#D1FAE5", "#A7F3D0", "#6EE7B7", "#34D399", "#10B981", "#059669"];
                const barColor = GREENS[Math.min(idx, GREENS.length - 1)];
                return (
                  <div key={bar.label + bar.year} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${heightPx}px`,
                        background: barColor,
                        boxShadow: isLast
                          ? "0 0 0 2px #059669, 0 0 0 4px rgba(5,150,105,0.2)"
                          : undefined,
                      }}
                      title={`$${bar.mrr.toLocaleString()} MRR`}
                    />
                    <span
                      className={`text-[10px] ${
                        isLast ? "text-[#059669] font-semibold" : "text-[#9CA3AF]"
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl p-[18px]">
          <div className="text-[13.5px] font-semibold text-[#111827] mb-4">Plan breakdown</div>
          {metricsLoading ? (
            <div className="flex flex-col gap-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-[5px]">
                    <div className="h-3 w-16 bg-[#F3F4F6] rounded" />
                    <div className="h-3 w-16 bg-[#F3F4F6] rounded" />
                  </div>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedPlanBreakdown.map((row) => {
                const pct = totalOrgs > 0 ? Math.round((row.count / totalOrgs) * 100) : 0;
                const color = PLAN_COLORS[row.plan] ?? "#D1FAE5";
                const detail = row.plan === "free"
                  ? "$0 MRR"
                  : `$${row.mrr.toLocaleString()} MRR · ${PLAN_DETAIL[row.plan] ?? ""}`;
                return (
                  <div key={row.plan}>
                    <div className="flex justify-between mb-[5px]">
                      <span className="text-[12.5px] font-medium text-[#374151]">
                        {planDisplayName(row.plan)}
                      </span>
                      <span className="text-[12.5px] font-semibold text-[#111827] tabular-nums">
                        {row.count} tenant{row.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F3F4F6] rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <div className="text-[11px] text-[#9CA3AF] mt-[3px]">{detail}</div>
                  </div>
                );
              })}
              {sortedPlanBreakdown.length === 0 && (
                <p className="text-[12.5px] text-[#9CA3AF]">No subscriptions found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent signups + system health */}
      <div className="grid grid-cols-[1fr_340px] gap-[14px] flex-1 min-h-0">
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
          <div className="px-[18px] py-[13px] border-b border-[#F3F4F6] flex justify-between items-center">
            <span className="text-[13.5px] font-semibold text-[#111827]">Recent signups</span>
            <Link
              href="/back-office/tenants"
              className="text-xs text-[#059669] font-medium no-underline"
              data-testid="link-view-all-tenants"
            >
              View all tenants
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[1fr_90px_80px_110px_120px] px-[18px] py-2 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Organization
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Plan
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Users
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase">
                Signed up
              </span>
              <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase text-right">
                Actions
              </span>
            </div>
            {metricsLoading ? (
              <div className="animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_90px_80px_110px_120px] px-[18px] py-[11px] border-b border-[#F9FAFB] items-center"
                  >
                    <div className="space-y-1">
                      <div className="h-3 w-32 bg-[#F3F4F6] rounded" />
                      <div className="h-2 w-24 bg-[#F3F4F6] rounded" />
                    </div>
                    <div className="h-4 w-16 bg-[#F3F4F6] rounded-full" />
                    <div className="h-3 w-12 bg-[#F3F4F6] rounded" />
                    <div className="h-3 w-20 bg-[#F3F4F6] rounded" />
                    <div className="flex gap-[5px] justify-end">
                      <div className="h-6 w-10 bg-[#F3F4F6] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : metrics?.recentSignups.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[12.5px] text-[#9CA3AF]">
                No organizations yet.
              </div>
            ) : (
              metrics?.recentSignups.map((row, i) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[1fr_90px_80px_110px_120px] px-[18px] py-[11px] border-b border-[#F9FAFB] items-center ${
                    i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                  }`}
                  data-testid={`row-tenant-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <div>
                    <div className="text-[13px] font-medium text-[#111827]">{row.name}</div>
                  </div>
                  <span
                    className={`text-[11.5px] font-semibold px-[9px] py-[3px] rounded-full whitespace-nowrap w-fit ${planPillClass(
                      row.plan
                    )}`}
                  >
                    {planDisplayName(row.plan)}
                  </span>
                  <span className="text-[12.5px] text-[#374151] tabular-nums">
                    {row.userCount} user{row.userCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[12.5px] text-[#6B7280]">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </span>
                  <div className="flex gap-[5px] justify-end">
                    <Link href="/back-office/tenants">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto text-[11.5px] text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-[9px] py-[3px]"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System health */}
        <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl p-[18px] flex flex-col gap-[14px]">
          <div className="text-[13.5px] font-semibold text-[#111827]">System health</div>
          {healthLoading ? (
            <div className="flex flex-col gap-[9px] animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#F3F4F6]" />
                    <div className="h-3 w-20 bg-[#F3F4F6] rounded" />
                  </div>
                  <div className="h-3 w-16 bg-[#F3F4F6] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-[9px]">
              {systemServices.map((svc) => (
                <div key={svc.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-[7px] h-[7px] rounded-full"
                      style={{ background: svc.ok ? "#059669" : "#D97706" }}
                    />
                    <span className="text-[13px] text-[#374151]">{svc.label}</span>
                  </div>
                  {svc.ok ? (
                    <span className="text-xs font-semibold text-[#059669] flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#D97706] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                </div>
              ))}
              {!health && (
                <p className="text-[12px] text-[#9CA3AF]">Could not reach health endpoint.</p>
              )}
            </div>
          )}
          {health && (
            <div className="border-t border-[#F3F4F6] pt-3">
              <p className="text-[11px] text-[#9CA3AF]">
                Last checked{" "}
                {format(new Date(health.timestamp), "MMM d, HH:mm:ss")}
              </p>
            </div>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
